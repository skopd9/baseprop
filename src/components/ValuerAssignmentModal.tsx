import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { 
  UserIcon, 
  EnvelopeIcon, 
  CalendarIcon,
  DocumentTextIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';

interface ValuerAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (valuerData: ValuerAssignmentData) => void;
  propertyName?: string;
}

interface ValuerAssignmentData {
  valuerName: string;
  valuerEmail: string;
  assignmentDate: string;
  expectedCompletion: string;
  assignmentNotes: string;
}

export const ValuerAssignmentModal: React.FC<ValuerAssignmentModalProps> = ({
  isOpen,
  onClose,
  onAssign,
  propertyName
}) => {
  const [valuerName, setValuerName] = useState('');
  const [valuerEmail, setValuerEmail] = useState('');
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedCompletion, setExpectedCompletion] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!valuerName || !valuerEmail || !expectedCompletion) {
      alert('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Simulate sending email notification
      console.log('📧 Sending email notification to:', valuerEmail);
      console.log('📋 Assignment details:', {
        valuerName,
        propertyName,
        assignmentDate,
        expectedCompletion,
        assignmentNotes
      });

      // In a real implementation, you would:
      // 1. Send email notification to valuer
      // 2. Update workflow status
      // 3. Log the assignment

      const valuerData: ValuerAssignmentData = {
        valuerName,
        valuerEmail,
        assignmentDate,
        expectedCompletion,
        assignmentNotes
      };

      onAssign(valuerData);
      onClose();
      
      // Reset form
      setValuerName('');
      setValuerEmail('');
      setAssignmentDate(new Date().toISOString().split('T')[0]);
      setExpectedCompletion('');
      setAssignmentNotes('');
      
    } catch (error) {
      console.error('Error assigning valuer:', error);
      alert('Failed to assign valuer. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <Dialog.Overlay className="fixed inset-0 bg-black bg-opacity-30" />
        
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-auto z-50">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <Dialog.Title className="text-lg font-semibold text-gray-900">
              Assign Valuer
            </Dialog.Title>
            <button
              onClick={onClose}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {propertyName && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Property:</strong> {propertyName}
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valuer Name *
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={valuerName}
                  onChange={(e) => setValuerName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter valuer name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Valuer Email *
              </label>
              <div className="relative">
                <EnvelopeIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={valuerEmail}
                  onChange={(e) => setValuerEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="valuer@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment Date
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={assignmentDate}
                  onChange={(e) => setAssignmentDate(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Expected Completion Date *
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="date"
                  value={expectedCompletion}
                  onChange={(e) => setExpectedCompletion(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment Notes
              </label>
              <div className="relative">
                <DocumentTextIcon className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                <textarea
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                  rows={3}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Any special instructions or notes for the valuer..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Assigning...' : 'Assign Valuer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Dialog>
  );
}; 