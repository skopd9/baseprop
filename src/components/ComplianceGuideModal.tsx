import React from 'react';
import { 
  XMarkIcon,
  DocumentCheckIcon,
  FireIcon,
  BoltIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { CountryCode, getCountryConfig, ComplianceRequirement } from '../lib/countries';

interface ComplianceGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  countryCode: CountryCode;
}

const getFrequencyText = (frequency: string) => {
  switch (frequency) {
    case 'annual':
      return 'Every year';
    case 'biennial':
      return 'Every 2 years';
    case '5_years':
      return 'Every 5 years';
    case '10_years':
      return 'Every 10 years';
    case 'once':
      return 'Once per tenancy';
    case 'as_needed':
      return 'As needed';
    default:
      return frequency;
  }
};

const getComplianceIcon = (req: ComplianceRequirement) => {
  if (req.id.includes('gas')) return <FireIcon className="w-6 h-6 text-orange-600" />;
  if (req.id.includes('electric') || req.id.includes('eicr')) return <BoltIcon className="w-6 h-6 text-yellow-600" />;
  if (req.id.includes('epc') || req.id.includes('energy')) return <ShieldCheckIcon className="w-6 h-6 text-green-600" />;
  if (req.id.includes('lead_paint')) return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-600" />;
  if (req.id.includes('smoke') || req.id.includes('fire') || req.id.includes('civil_defense')) return <FireIcon className="w-6 h-6 text-red-600" />;
  if (req.id.includes('ejar')) return <DocumentCheckIcon className="w-6 h-6 text-green-600" />;
  if (req.id.includes('title_deed')) return <DocumentCheckIcon className="w-6 h-6 text-blue-600" />;
  if (req.id.includes('watani')) return <MapPinIcon className="w-6 h-6 text-blue-600" />;
  return <DocumentCheckIcon className="w-6 h-6 text-blue-600" />;
};

const CountrySpecificInfo: React.FC<{ countryCode: CountryCode }> = ({ countryCode }) => {
  switch (countryCode) {
    case 'UK':
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">🇬🇧 UK Landlord Compliance</h4>
            <p className="text-sm text-blue-800 mb-3">
              As a UK landlord, you must comply with comprehensive safety and legal requirements. 
              Failure to maintain these certificates can result in fines up to £30,000 and potential prosecution.
            </p>
            <div className="space-y-2 text-sm text-blue-800">
              <p><strong>Key Points:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All properties must have an EPC rating of E or above</li>
                <li>Gas Safety Certificate required annually (if gas appliances present)</li>
                <li>EICR electrical safety check required every 5 years</li>
                <li>Right to Rent checks must be completed before tenancy starts</li>
                <li>Deposit must be protected within 30 days in a government scheme</li>
                <li>HMO properties have additional fire safety requirements</li>
              </ul>
            </div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Important:</strong> Keep all certificates and records for at least 2 years after the tenancy ends.
              Provide copies to tenants within 28 days of completion.
            </p>
          </div>
        </div>
      );
    
    case 'US':
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">🇺🇸 US Property Compliance</h4>
            <p className="text-sm text-blue-800 mb-3">
              US rental property requirements vary significantly by state and municipality. 
              These are baseline federal requirements - check your local regulations for additional requirements.
            </p>
            <div className="space-y-2 text-sm text-blue-800">
              <p><strong>Key Points:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Lead paint disclosure required for properties built before 1978</li>
                <li>Smoke detectors required in all sleeping areas and on each floor</li>
                <li>Carbon monoxide detectors required near bedrooms (most states)</li>
                <li>Fair Housing laws must be followed - no discrimination</li>
                <li>Many cities require rental permits or licenses</li>
                <li>State-specific requirements for security deposits vary</li>
              </ul>
            </div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>⚠️ State Variations:</strong> Requirements differ significantly by state. California, New York, 
              and Florida have extensive additional requirements. Consult local housing authorities.
            </p>
          </div>
        </div>
      );
    
    case 'GR':
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">🇬🇷 Greece Property Compliance</h4>
            <p className="text-sm text-blue-800 mb-3">
              Greek rental properties must comply with building regulations and tax requirements. 
              All rental income must be declared to the tax authorities.
            </p>
            <div className="space-y-2 text-sm text-blue-800">
              <p><strong>Key Points:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Energy Performance Certificate (ΠΕΑ) required for all rental properties</li>
                <li>Valid building permit (οικοδομική άδεια) documentation needed</li>
                <li>Property tax (ΕΝΦΙΑ) must be paid and clearance certificate obtained</li>
                <li>Rental contracts must be registered with the tax office (ΑΑΔΕ)</li>
                <li>Short-term rentals require special registration with tourism authorities</li>
                <li>All utilities must be in working order and documented</li>
              </ul>
            </div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Tax Requirements:</strong> All rental agreements must be submitted electronically via TAXISnet. 
              Failure to declare rental income can result in substantial penalties.
            </p>
          </div>
        </div>
      );

    case 'SA':
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">🇸🇦 Saudi Arabia Property Compliance</h4>
            <p className="text-sm text-blue-800 mb-3">
              Saudi rental market regulations are governed by the Ejar system.
              All residential rental contracts must be registered electronically.
            </p>
            <div className="space-y-2 text-sm text-blue-800">
              <p><strong>Key Points:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>All contracts must be registered in Ejar (mandatory)</li>
                <li>Valid Title Deed (Sukuk) required for property registration</li>
                <li>Building Permit must be valid and correspond to the property</li>
                <li>National Address (Watani Address) registration is mandatory</li>
                <li>Civil Defense permit required for some property types</li>
              </ul>
            </div>
          </div>
          <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>⚠️ Ejar Registration:</strong> Contracts not registered in Ejar are not legally binding and cannot be enforced in court.
              Ensure all tenant details match their Absher records.
            </p>
          </div>
        </div>
      );
  }
};

export const ComplianceGuideModal: React.FC<ComplianceGuideModalProps> = ({ 
  isOpen, 
  onClose,
  countryCode 
}) => {
  if (!isOpen) return null;

  const countryConfig = getCountryConfig(countryCode);
  const complianceRequirements = countryConfig.compliance;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Compliance Requirements for {countryConfig.name}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Required documents and certificates for rental properties
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Country-specific information */}
          <CountrySpecificInfo countryCode={countryCode} />

          {/* Requirements List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Required Documents ({complianceRequirements.length})
            </h3>
            
            <div className="space-y-3">
              {complianceRequirements.map((req) => (
                <div 
                  key={req.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-green-300 transition-colors"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getComplianceIcon(req)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-gray-900">
                          {req.name}
                          {req.mandatory && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                              Mandatory
                            </span>
                          )}
                        </h4>
                        <span className="text-sm font-medium text-gray-600">
                          {getFrequencyText(req.frequency)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {req.description}
                      </p>
                      {req.appliesToHMO && !req.appliesToStandard && (
                        <p className="text-xs text-purple-600 mt-2">
                          ⚠️ HMO properties only
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Resources */}
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <h4 className="font-semibold text-gray-900 mb-2">📚 Additional Resources</h4>
            <div className="space-y-2 text-sm text-gray-700">
              {countryCode === 'UK' && (
                <>
                  <p>• <a href="https://www.gov.uk/renting-out-a-property" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Gov.uk - Renting Out Your Property</a></p>
                  <p>• <a href="https://www.gov.uk/government/publications/landlord-responsibilities-england" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Landlord Responsibilities Guide</a></p>
                  <p>• <a href="https://www.nrla.org.uk/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">National Residential Landlords Association</a></p>
                </>
              )}
              {countryCode === 'US' && (
                <>
                  <p>• <a href="https://www.hud.gov/topics/rental_assistance/tenantrights" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">HUD - Tenant Rights</a></p>
                  <p>• <a href="https://www.epa.gov/lead/rental-property-management" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">EPA - Lead Paint Requirements</a></p>
                  <p>• Contact your state's housing authority for local requirements</p>
                </>
              )}
              {countryCode === 'GR' && (
                <>
                  <p>• <a href="https://www.aade.gr/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ΑΑΔΕ (Tax Authority)</a></p>
                  <p>• <a href="https://www.buildingcert.gr/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Building Energy Performance Certificates</a></p>
                  <p>• Consult with a local property lawyer for specific requirements</p>
                </>
              )}
              {countryCode === 'SA' && (
                <>
                  <p>• <a href="https://www.ejar.sa/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Ejar (Rental Services Network)</a></p>
                  <p>• <a href="https://momrah.gov.sa/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">MOMRAH (Municipal & Rural Affairs)</a></p>
                  <p>• <a href="https://splonline.com.sa/en/national-address-1/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Saudi National Address</a></p>
                  <p>• <a href="https://998.gov.sa/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Saudi Civil Defense</a></p>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

