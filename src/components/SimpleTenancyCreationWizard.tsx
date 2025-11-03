import React, { useState } from 'react';

interface Tenant {
  id: string;
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  isLead: boolean;
}

interface TenancyData {
  property: string;
  room: string;
  startDate: string;
  monthlyRent: number;
  deposit: number;
  tenants: Tenant[];
  referenceCheckOrdered: boolean;
  documentsChecklist: string[];
  contractGenerated: boolean;
  conciergeService: 'purchase' | 'self-manage' | null;
  checkInTasks: string[];
}

interface SimpleTenancyCreationWizardProps {
  properties: any[];
  onTenancyCreated: (tenant: any) => void;
  existingTenant?: any;
}

const SimpleTenancyCreationWizard: React.FC<SimpleTenancyCreationWizardProps> = ({ 
  properties, 
  onTenancyCreated,
  existingTenant 
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [tenancyData, setTenancyData] = useState<TenancyData>({
    property: existingTenant?.propertyAddress || '',
    room: existingTenant?.room || '',
    startDate: existingTenant?.leaseStart || '',
    monthlyRent: existingTenant?.monthlyRent || 0,
    deposit: existingTenant?.deposit || 0,
    tenants: existingTenant ? [{ 
      id: '1', 
      firstName: existingTenant.name.split(' ')[0] || '', 
      surname: existingTenant.name.split(' ').slice(1).join(' ') || '', 
      email: existingTenant.email, 
      phone: existingTenant.phone, 
      isLead: true 
    }] : [{ id: '1', firstName: '', surname: '', email: '', phone: '', isLead: true }],
    referenceCheckOrdered: existingTenant?.referenceCheckStatus === 'completed' || false,
    documentsChecklist: [
      'Right to Rent documents',
      'Bank statements (3 months)',
      'Employment contract',
      'Previous landlord reference',
      'Guarantor details (if required)'
    ],
    contractGenerated: existingTenant?.contractGenerated || false,
    conciergeService: existingTenant?.conciergeService || null,
    checkInTasks: [
      'Property inventory report',
      'Meter readings (gas, electricity, water)',
      'Key handover',
      'Property walkthrough',
      'Emergency contact information'
    ]
  });

  const addTenant = () => {
    const newTenant: Tenant = {
      id: Date.now().toString(),
      firstName: '',
      surname: '',
      email: '',
      phone: '',
      isLead: false
    };
    setTenancyData(prev => ({
      ...prev,
      tenants: [...prev.tenants, newTenant]
    }));
  };

  const updateTenant = (id: string, field: keyof Tenant, value: string | boolean) => {
    setTenancyData(prev => ({
      ...prev,
      tenants: prev.tenants.map(tenant =>
        tenant.id === id ? { ...tenant, [field]: value } : tenant
      )
    }));
  };

  const removeTenant = (id: string) => {
    if (tenancyData.tenants.length > 1) {
      setTenancyData(prev => ({
        ...prev,
        tenants: prev.tenants.filter(tenant => tenant.id !== id)
      }));
    }
  };

  const nextStep = () => {
    if (currentStep < 4) setCurrentStep(currentStep + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const handleCreateTenancy = () => {
    // Find the selected property
    const selectedProperty = properties.find(p => p.address === tenancyData.property);
    if (!selectedProperty) return;

    // Create tenant data from the lead tenant
    const leadTenant = tenancyData.tenants.find(t => t.isLead);
    if (!leadTenant) return;

    const newTenant = {
      id: Date.now().toString(),
      name: `${leadTenant.firstName} ${leadTenant.surname}`,
      email: leadTenant.email,
      phone: leadTenant.phone,
      propertyId: selectedProperty.id,
      propertyAddress: selectedProperty.address,
      room: tenancyData.room,
      monthlyRent: tenancyData.monthlyRent,
      deposit: tenancyData.deposit,
      leaseStart: tenancyData.startDate,
      leaseEnd: '', // Could calculate based on lease term
      status: 'active' as const,
      rentStatus: 'current' as const,
      additionalTenants: tenancyData.tenants.filter(t => !t.isLead).length,
      referenceCheckStatus: tenancyData.referenceCheckOrdered ? 'completed' : 'pending',
      contractGenerated: tenancyData.contractGenerated,
      conciergeService: tenancyData.conciergeService
    };

    onTenancyCreated(newTenant);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4].map((step) => (
        <div key={step} className="flex items-center">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
            step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
          }`}>
            {step}
          </div>
          {step < 4 && (
            <div className={`w-16 h-1 mx-2 ${
              step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Step 1: Tenancy Details</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Property</label>
          <select
            value={tenancyData.property}
            onChange={(e) => setTenancyData(prev => ({ ...prev, property: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.address}>
                {property.address}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Room</label>
          <select
            value={tenancyData.room}
            onChange={(e) => setTenancyData(prev => ({ ...prev, room: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select Room</option>
            <option value="Room 1">Room 1</option>
            <option value="Room 2">Room 2</option>
            <option value="Room 3">Room 3</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
          <input
            type="date"
            value={tenancyData.startDate}
            onChange={(e) => setTenancyData(prev => ({ ...prev, startDate: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Monthly Rent (£)</label>
          <input
            type="number"
            value={tenancyData.monthlyRent}
            onChange={(e) => setTenancyData(prev => ({ ...prev, monthlyRent: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Deposit (£)</label>
          <input
            type="number"
            value={tenancyData.deposit}
            onChange={(e) => setTenancyData(prev => ({ ...prev, deposit: parseFloat(e.target.value) || 0 }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Tenants</h3>
          <button
            onClick={addTenant}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Add Tenant
          </button>
        </div>
        
        <div className="space-y-4">
          {tenancyData.tenants.map((tenant, index) => (
            <div key={tenant.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">
                  {tenant.isLead ? 'Lead Tenant' : `Tenant ${index}`}
                </h4>
                {!tenant.isLead && (
                  <button
                    onClick={() => removeTenant(tenant.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                  <input
                    type="text"
                    value={tenant.firstName}
                    onChange={(e) => updateTenant(tenant.id, 'firstName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="First name"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surname</label>
                  <input
                    type="text"
                    value={tenant.surname}
                    onChange={(e) => updateTenant(tenant.id, 'surname', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Surname"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={tenant.email}
                    onChange={(e) => updateTenant(tenant.id, 'email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter email"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={tenant.phone}
                    onChange={(e) => updateTenant(tenant.id, 'phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Step 2: Reference Check</h2>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Order Reference Check</h3>
        <p className="text-blue-700 text-sm mb-4">
          We'll run comprehensive reference checks for all tenants including credit history, employment verification, and previous landlord references.
        </p>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setTenancyData(prev => ({ ...prev, referenceCheckOrdered: true }))}
            disabled={tenancyData.referenceCheckOrdered}
            className={`px-6 py-2 rounded-md transition-colors ${
              tenancyData.referenceCheckOrdered
                ? 'bg-green-600 text-white cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {tenancyData.referenceCheckOrdered ? '✓ Reference Check Ordered' : 'Order Reference Check'}
          </button>
          
          {tenancyData.referenceCheckOrdered && (
            <span className="text-green-600 text-sm font-medium">
              Estimated completion: 2-3 business days
            </span>
          )}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Tenants to be checked:</h3>
        <div className="space-y-2">
          {tenancyData.tenants.map((tenant) => (
            <div key={tenant.id} className="flex items-center justify-between py-2 px-3 bg-white rounded border">
              <div>
                <span className="font-medium">{tenant.firstName && tenant.surname ? `${tenant.firstName} ${tenant.surname}` : 'Unnamed Tenant'}</span>
                {tenant.isLead && <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Lead</span>}
              </div>
              <span className="text-sm text-gray-600">{tenant.email}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Step 3: Documents & Contract</h2>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-900 mb-3">Document Checklist</h3>
        <p className="text-yellow-700 text-sm mb-4">
          These documents will be requested from your tenants before the tenancy begins.
        </p>
        
        <div className="space-y-2">
          {tenancyData.documentsChecklist.map((doc, index) => (
            <div key={index} className="flex items-center space-x-3">
              <input
                type="checkbox"
                id={`doc-${index}`}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                defaultChecked
              />
              <label htmlFor={`doc-${index}`} className="text-sm text-gray-700">
                {doc}
              </label>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-medium text-green-900 mb-2">Tenancy Agreement</h3>
        <p className="text-green-700 text-sm mb-4">
          Generate a legally compliant tenancy agreement based on your property and tenant details.
        </p>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setTenancyData(prev => ({ ...prev, contractGenerated: true }))}
            disabled={tenancyData.contractGenerated}
            className={`px-6 py-2 rounded-md transition-colors ${
              tenancyData.contractGenerated
                ? 'bg-green-600 text-white cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {tenancyData.contractGenerated ? '✓ Contract Generated' : 'Generate Contract'}
          </button>
          
          {tenancyData.contractGenerated && (
            <button className="px-4 py-2 bg-white border border-green-600 text-green-600 rounded-md hover:bg-green-50 transition-colors">
              Download PDF
            </button>
          )}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Contract Summary</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Property:</span>
            <span className="ml-2 font-medium">{tenancyData.property || 'Not selected'}</span>
          </div>
          <div>
            <span className="text-gray-600">Room:</span>
            <span className="ml-2 font-medium">{tenancyData.room || 'Not selected'}</span>
          </div>
          <div>
            <span className="text-gray-600">Start Date:</span>
            <span className="ml-2 font-medium">{tenancyData.startDate || 'Not set'}</span>
          </div>
          <div>
            <span className="text-gray-600">Monthly Rent:</span>
            <span className="ml-2 font-medium">£{tenancyData.monthlyRent}</span>
          </div>
          <div>
            <span className="text-gray-600">Deposit:</span>
            <span className="ml-2 font-medium">£{tenancyData.deposit}</span>
          </div>
          <div>
            <span className="text-gray-600">Tenants:</span>
            <span className="ml-2 font-medium">{tenancyData.tenants.length}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Step 4: Check-in Management</h2>
      
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <h3 className="font-medium text-purple-900 mb-3">Choose Your Check-in Service</h3>
        <p className="text-purple-700 text-sm mb-4">
          Select how you'd like to manage the tenant check-in process.
        </p>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="purchase-service"
              name="concierge"
              value="purchase"
              checked={tenancyData.conciergeService === 'purchase'}
              onChange={(e) => setTenancyData(prev => ({ ...prev, conciergeService: e.target.value as 'purchase' }))}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="purchase-service" className="text-sm">
              <span className="font-medium">Purchase Concierge Service</span>
              <span className="text-gray-600 ml-2">(£75 - Professional check-in service)</span>
            </label>
          </div>
          
          <div className="flex items-center space-x-3">
            <input
              type="radio"
              id="self-manage"
              name="concierge"
              value="self-manage"
              checked={tenancyData.conciergeService === 'self-manage'}
              onChange={(e) => setTenancyData(prev => ({ ...prev, conciergeService: e.target.value as 'self-manage' }))}
              className="h-4 w-4 text-purple-600 focus:ring-purple-500"
            />
            <label htmlFor="self-manage" className="text-sm">
              <span className="font-medium">Self-Manage Check-in</span>
              <span className="text-gray-600 ml-2">(Use our checklist and manage yourself)</span>
            </label>
          </div>
        </div>
      </div>

      {tenancyData.conciergeService === 'self-manage' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-3">Check-in Checklist</h3>
          <p className="text-blue-700 text-sm mb-4">
            Complete these tasks during the tenant check-in process.
          </p>
          
          <div className="space-y-3">
            {tenancyData.checkInTasks.map((task, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id={`task-${index}`}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor={`task-${index}`} className="text-sm text-gray-700">
                  {task}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {tenancyData.conciergeService === 'purchase' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-900 mb-2">Concierge Service Included</h3>
          <p className="text-green-700 text-sm mb-3">
            Our professional team will handle all check-in tasks for you.
          </p>
          <ul className="text-sm text-green-700 space-y-1">
            <li>• Professional property inventory</li>
            <li>• Meter readings and documentation</li>
            <li>• Key handover and security briefing</li>
            <li>• Property walkthrough with tenant</li>
            <li>• Emergency contact setup</li>
          </ul>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">Tenancy Summary</h3>
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Property & Room:</span>
            <span className="font-medium">{tenancyData.property} - {tenancyData.room}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Lead Tenant:</span>
            <span className="font-medium">{(() => {
              const leadTenant = tenancyData.tenants.find(t => t.isLead);
              return leadTenant && leadTenant.firstName && leadTenant.surname 
                ? `${leadTenant.firstName} ${leadTenant.surname}` 
                : 'Not set';
            })()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Total Tenants:</span>
            <span className="font-medium">{tenancyData.tenants.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Monthly Rent:</span>
            <span className="font-medium">£{tenancyData.monthlyRent}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Reference Check:</span>
            <span className={`font-medium ${tenancyData.referenceCheckOrdered ? 'text-green-600' : 'text-red-600'}`}>
              {tenancyData.referenceCheckOrdered ? 'Ordered' : 'Not ordered'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Contract:</span>
            <span className={`font-medium ${tenancyData.contractGenerated ? 'text-green-600' : 'text-red-600'}`}>
              {tenancyData.contractGenerated ? 'Generated' : 'Not generated'}
            </span>
          </div>
        </div>
        
        <button 
          onClick={handleCreateTenancy}
          className="w-full mt-4 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Create Tenancy
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      {renderStepIndicator()}
      
      <div className="min-h-96">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>
      
      <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
        <button
          onClick={prevStep}
          disabled={currentStep === 1}
          className={`px-6 py-2 rounded-md transition-colors ${
            currentStep === 1
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-gray-600 text-white hover:bg-gray-700'
          }`}
        >
          Previous
        </button>
        
        <button
          onClick={nextStep}
          disabled={currentStep === 4}
          className={`px-6 py-2 rounded-md transition-colors ${
            currentStep === 4
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          Next
        </button>
      </div>
    </div>
  );
};

export default SimpleTenancyCreationWizard;