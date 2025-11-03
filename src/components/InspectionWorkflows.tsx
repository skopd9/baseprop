import React, { useState, useEffect } from 'react';
import {
    DocumentCheckIcon,
    CalendarIcon,
    HomeIcon,
    UserIcon,
    CheckCircleIcon,
    ClockIcon,
    ExclamationTriangleIcon,
    EnvelopeIcon
} from '@heroicons/react/24/outline';
import { SimplifiedProperty, SimplifiedTenant } from '../utils/simplifiedDataTransforms';
import { EmailNotificationService } from '../services/EmailNotificationService';
import { TenantPropertyService } from '../services/TenantPropertyService';
import { supabase } from '../lib/supabase';

interface InspectionWorkflowsProps {
    properties: SimplifiedProperty[];
    tenants: SimplifiedTenant[];
    onBookInspection?: (inspection: any) => void;
}

interface Inspection {
    id: string;
    propertyId: string;
    propertyAddress: string;
    tenantId?: string;
    tenantName?: string;
    tenantEmail?: string;
    type: 'routine' | 'move-in' | 'move-out' | 'maintenance' | 'safety';
    status: 'scheduled' | 'completed' | 'overdue' | 'in_progress' | 'cancelled';
    scheduledDate: Date;
    completedDate?: Date;
    findings?: string;
    actionItems?: string[];
    photos?: string[];
    conditionRating?: 'excellent' | 'good' | 'fair' | 'poor';
    notificationSent?: boolean;
    reminderSent?: boolean;
}

export const InspectionWorkflows: React.FC<InspectionWorkflowsProps> = ({
    properties,
    tenants,
    onBookInspection
}) => {
    const [inspections, setInspections] = useState<Inspection[]>([]);
    const [showBookingForm, setShowBookingForm] = useState(false);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const [bookingForm, setBookingForm] = useState({
        propertyId: '',
        type: 'routine' as 'routine' | 'move-in' | 'move-out' | 'maintenance' | 'safety',
        scheduledDate: '',
        scheduledTime: '10:00',
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [cancelling, setCancelling] = useState<string | null>(null);
    const [propertyTenants, setPropertyTenants] = useState<{[key: string]: Array<{
        id: string;
        name: string;
        email: string;
        unitNumber?: string;
    }>}>({});

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'scheduled':
                return 'bg-blue-100 text-blue-800';
            case 'overdue':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    // Load inspections from database
    useEffect(() => {
        loadInspections();
        loadTenantsByProperty();
    }, [properties]);

    const loadInspections = async () => {
        try {
            const { data, error } = await supabase
                .from('inspections')
                .select(`
                    *,
                    properties(id, address, name),
                    tenants(id, name, email)
                `)
                .order('scheduled_date', { ascending: true });

            if (error) {
                console.error('Error loading inspections:', error);
                return;
            }

            const formattedInspections: Inspection[] = data?.map(inspection => ({
                id: inspection.id,
                propertyId: inspection.property_id,
                propertyAddress: inspection.properties?.address || 'Unknown Property',
                tenantId: inspection.tenant_id,
                tenantName: inspection.tenants?.name,
                tenantEmail: inspection.tenants?.email,
                type: inspection.inspection_type,
                status: inspection.status,
                scheduledDate: new Date(inspection.scheduled_date),
                completedDate: inspection.completed_date ? new Date(inspection.completed_date) : undefined,
                findings: inspection.findings,
                actionItems: inspection.action_items || [],
                conditionRating: inspection.condition_rating,
                notificationSent: inspection.notification_sent,
                reminderSent: inspection.reminder_sent
            })) || [];

            setInspections(formattedInspections);
        } catch (error) {
            console.error('Error in loadInspections:', error);
        }
    };

    const loadTenantsByProperty = async () => {
        try {
            const grouped = await TenantPropertyService.getTenantsGroupedByProperty();
            setPropertyTenants(grouped);
        } catch (error) {
            console.error('Error loading tenants by property:', error);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'routine':
                return <DocumentCheckIcon className="w-4 h-4" />;
            case 'move-in':
                return <UserIcon className="w-4 h-4" />;
            case 'move-out':
                return <HomeIcon className="w-4 h-4" />;
            case 'maintenance':
                return <DocumentCheckIcon className="w-4 h-4" />;
            case 'safety':
                return <ExclamationTriangleIcon className="w-4 h-4" />;
            default:
                return <DocumentCheckIcon className="w-4 h-4" />;
        }
    };

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(date);
    };

    const handleBookInspection = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const selectedProperty = properties.find(p => p.id === bookingForm.propertyId);
            const tenantsForProperty = propertyTenants[bookingForm.propertyId] || [];
            
            // Combine date and time
            const scheduledDateTime = new Date(`${bookingForm.scheduledDate}T${bookingForm.scheduledTime}:00`);

            // Create inspection in database
            const { data: newInspection, error } = await supabase
                .from('inspections')
                .insert({
                    property_id: bookingForm.propertyId,
                    tenant_id: tenantsForProperty[0]?.id || null,
                    inspection_type: bookingForm.type,
                    status: 'scheduled',
                    scheduled_date: scheduledDateTime.toISOString(),
                    notes: bookingForm.notes,
                    inspector_name: 'Property Inspector',
                    inspector_email: 'inspector@propertymanagement.com'
                })
                .select()
                .single();

            if (error) {
                console.error('Error creating inspection:', error);
                alert('Failed to book inspection. Please try again.');
                return;
            }

            // Send email notifications to all tenants for this property
            const emailPromises = tenantsForProperty
                .filter(tenant => tenant.email)
                .map(tenant => 
                    EmailNotificationService.sendInspectionBookingNotification(
                        tenant.email,
                        tenant.name,
                        selectedProperty?.address || 'Unknown Property',
                        bookingForm.type,
                        scheduledDateTime,
                        bookingForm.notes
                    )
                );

            // Send all emails
            const emailResults = await Promise.all(emailPromises);
            const emailsSent = emailResults.filter(result => result).length;

            // Update notification sent status if emails were sent
            if (emailsSent > 0) {
                await supabase
                    .from('inspections')
                    .update({ notification_sent: true })
                    .eq('id', newInspection.id);
            }

            // Reload inspections
            await loadInspections();

            // Reset form
            setShowBookingForm(false);
            setBookingForm({
                propertyId: '',
                type: 'routine',
                scheduledDate: '',
                scheduledTime: '10:00',
                notes: ''
            });

            // Show success message
            alert(`Inspection booked successfully! ${emailsSent} email notification(s) sent to tenant(s).`);

            if (onBookInspection) {
                onBookInspection(newInspection);
            }
        } catch (error) {
            console.error('Error booking inspection:', error);
            alert('Failed to book inspection. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancelInspection = async (inspection: Inspection) => {
        if (!confirm(`Are you sure you want to cancel the ${inspection.type} inspection for ${inspection.propertyAddress}?`)) {
            return;
        }

        setCancelling(inspection.id);

        try {
            // Update inspection status to cancelled
            const { error } = await supabase
                .from('inspections')
                .update({ 
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                })
                .eq('id', inspection.id);

            if (error) {
                console.error('Error cancelling inspection:', error);
                alert('Failed to cancel inspection. Please try again.');
                return;
            }

            // Send cancellation emails to tenants
            const tenantsForProperty = propertyTenants[inspection.propertyId] || [];
            const emailPromises = tenantsForProperty
                .filter(tenant => tenant.email)
                .map(tenant => 
                    EmailNotificationService.sendInspectionCancellationNotification(
                        tenant.email,
                        tenant.name,
                        inspection.propertyAddress,
                        inspection.type,
                        inspection.scheduledDate,
                        'Cancelled by property management'
                    )
                );

            // Send all cancellation emails
            const emailResults = await Promise.all(emailPromises);
            const emailsSent = emailResults.filter(result => result).length;

            // Reload inspections
            await loadInspections();

            // Show success message
            alert(`Inspection cancelled successfully! ${emailsSent} cancellation notification(s) sent to tenant(s).`);

        } catch (error) {
            console.error('Error cancelling inspection:', error);
            alert('Failed to cancel inspection. Please try again.');
        } finally {
            setCancelling(null);
        }
    };

    const upcomingInspections = inspections.filter(i => 
        i.status === 'scheduled' || i.status === 'overdue' || i.status === 'in_progress'
    );
    const pastInspections = inspections.filter(i => 
        i.status === 'completed' || i.status === 'cancelled'
    );
    const overdueInspections = inspections.filter(i => i.status === 'overdue');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Property Inspections</h2>
                    <p className="text-gray-600">Schedule and manage property inspections</p>
                </div>
                <button
                    onClick={() => setShowBookingForm(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                >
                    <CalendarIcon className="w-4 h-4 mr-2" />
                    Book Inspection
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <ClockIcon className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Upcoming</p>
                            <p className="text-2xl font-bold text-gray-900">{upcomingInspections.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Overdue</p>
                            <p className="text-2xl font-bold text-gray-900">{overdueInspections.length}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircleIcon className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Completed</p>
                            <p className="text-2xl font-bold text-gray-900">{pastInspections.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow border border-gray-200">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex">
                        <button
                            onClick={() => setActiveTab('upcoming')}
                            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'upcoming'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Upcoming Inspections ({upcomingInspections.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('past')}
                            className={`py-4 px-6 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === 'past'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            Past Inspections ({pastInspections.length})
                        </button>
                    </nav>
                </div>

                {/* Tab Content */}
                <div className="divide-y divide-gray-200">
                    {activeTab === 'upcoming' && upcomingInspections.length === 0 && (
                        <div className="p-12 text-center">
                            <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No upcoming inspections</h3>
                            <p className="text-gray-500 mb-4">Schedule your first inspection to get started.</p>
                            <button
                                onClick={() => setShowBookingForm(true)}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                            >
                                <CalendarIcon className="w-4 h-4 mr-2" />
                                Book Inspection
                            </button>
                        </div>
                    )}

                    {activeTab === 'past' && pastInspections.length === 0 && (
                        <div className="p-12 text-center">
                            <CheckCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No past inspections</h3>
                            <p className="text-gray-500">Completed inspections will appear here.</p>
                        </div>
                    )}

                    {(activeTab === 'upcoming' ? upcomingInspections : pastInspections).map((inspection) => (
                        <div key={inspection.id} className="p-6 hover:bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className="p-2 bg-gray-100 rounded-lg">
                                            {getTypeIcon(inspection.type)}
                                        </div>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center space-x-2">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                                {inspection.propertyAddress}
                                            </p>
                                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(inspection.status)}`}>
                                                {inspection.status}
                                            </span>
                                        </div>

                                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                                            <span className="capitalize">{inspection.type} inspection</span>
                                            {inspection.tenantName && (
                                                <span>Tenant: {inspection.tenantName}</span>
                                            )}
                                            <span>Scheduled: {formatDate(inspection.scheduledDate)}</span>
                                            {inspection.notificationSent && (
                                                <span className="inline-flex items-center text-green-600">
                                                    <EnvelopeIcon className="w-3 h-3 mr-1" />
                                                    Email sent
                                                </span>
                                            )}
                                        </div>

                                        {inspection.findings && (
                                            <p className="mt-2 text-sm text-gray-600">{inspection.findings}</p>
                                        )}

                                        {inspection.actionItems && inspection.actionItems.length > 0 && (
                                            <div className="mt-2">
                                                <p className="text-xs font-medium text-gray-700">Action Items:</p>
                                                <ul className="mt-1 text-xs text-gray-600 list-disc list-inside">
                                                    {inspection.actionItems.map((item, index) => (
                                                        <li key={index}>{item}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center space-x-2">
                                    {activeTab === 'upcoming' && inspection.status === 'scheduled' && (
                                        <>
                                            {/* Only show Complete button if inspection date has passed */}
                                            {new Date() >= inspection.scheduledDate && (
                                                <button
                                                    className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                                                >
                                                    Complete
                                                </button>
                                            )}
                                            
                                            {/* Always show Cancel button for scheduled inspections */}
                                            <button
                                                onClick={() => handleCancelInspection(inspection)}
                                                disabled={cancelling === inspection.id}
                                                className="inline-flex items-center px-3 py-1 border border-red-300 text-xs font-medium rounded text-red-700 bg-white hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {cancelling === inspection.id ? 'Cancelling...' : 'Cancel'}
                                            </button>
                                        </>
                                    )}

                                    {inspection.conditionRating && (
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${inspection.conditionRating === 'excellent' ? 'bg-green-100 text-green-800' :
                                            inspection.conditionRating === 'good' ? 'bg-blue-100 text-blue-800' :
                                                inspection.conditionRating === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                            }`}>
                                            {inspection.conditionRating}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Booking Form Modal */}
            {showBookingForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Book New Inspection</h3>

                        <form onSubmit={handleBookInspection} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Property
                                </label>
                                <select
                                    value={bookingForm.propertyId}
                                    onChange={(e) => setBookingForm({ ...bookingForm, propertyId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                >
                                    <option value="">Select a property</option>
                                    {properties.map((property) => (
                                        <option key={property.id} value={property.id}>
                                            {property.address}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Inspection Type
                                </label>
                                <select
                                    value={bookingForm.type}
                                    onChange={(e) => setBookingForm({ ...bookingForm, type: e.target.value as any })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="routine">Routine Inspection</option>
                                    <option value="move-in">Move-in Inspection</option>
                                    <option value="move-out">Move-out Inspection</option>
                                    <option value="maintenance">Maintenance Inspection</option>
                                    <option value="safety">Safety Inspection</option>
                                </select>
                            </div>

                            {/* Show tenants for selected property */}
                            {bookingForm.propertyId && propertyTenants[bookingForm.propertyId] && (
                                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                                    <h4 className="text-sm font-medium text-blue-900 mb-2">
                                        Tenants who will be notified:
                                    </h4>
                                    <div className="space-y-1">
                                        {propertyTenants[bookingForm.propertyId].map((tenant) => (
                                            <div key={tenant.id} className="flex items-center space-x-2 text-sm text-blue-800">
                                                <UserIcon className="w-4 h-4" />
                                                <span>{tenant.name}</span>
                                                {tenant.email && (
                                                    <>
                                                        <span>•</span>
                                                        <span className="flex items-center">
                                                            <EnvelopeIcon className="w-3 h-3 mr-1" />
                                                            {tenant.email}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Scheduled Date
                                    </label>
                                    <input
                                        type="date"
                                        value={bookingForm.scheduledDate}
                                        onChange={(e) => setBookingForm({ ...bookingForm, scheduledDate: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Scheduled Time
                                    </label>
                                    <input
                                        type="time"
                                        value={bookingForm.scheduledTime}
                                        onChange={(e) => setBookingForm({ ...bookingForm, scheduledTime: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={bookingForm.notes}
                                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                    placeholder="Any special instructions or notes..."
                                />
                            </div>

                            <div className="flex justify-end space-x-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowBookingForm(false)}
                                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Booking...' : 'Book Inspection'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};