"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
var supabase_1 = require("../src/lib/supabase");
var template = {
    key: 'valuations',
    name: 'Group Valuations',
    stages: ['In Progress', 'Under Review', 'Completed'],
    workstreams: [
        {
            key: 'valuation_general',
            name: 'Valuation Details Collection',
            fields: [
                { id: 'asset_id', label: 'Asset ID', type: 'text' },
                { id: 'valuation_id', label: 'Valuation ID', type: 'text' },
                { id: 'work_type', label: 'Type of Work', type: 'select', options: ['Inspection', 'Market', 'Other'] },
                { id: 'inspection_type', label: 'Inspection Type', type: 'select', options: [] },
                { id: 'asset_type', label: 'Asset Type', type: 'select', options: [] },
                { id: 'asset_subtype', label: 'Asset Subtype', type: 'select', options: [] }
            ]
        },
        {
            key: 'valuation_location',
            name: 'Location',
            fields: [
                { id: 'street_address', label: 'Street Address', type: 'text' },
                { id: 'cadastral_number', label: 'Cadastral Number', type: 'text' },
                { id: 'country', label: 'Country', type: 'text' },
                { id: 'latitude', label: 'Latitude', type: 'number' },
                { id: 'longitude', label: 'Longitude', type: 'number' },
                { id: 'municipality', label: 'Municipality', type: 'text' },
                { id: 'postal_code', label: 'Postal Code', type: 'text' }
            ]
        },
        {
            key: 'valuation_description',
            name: 'Description',
            fields: [
                { id: 'site_frontage', label: 'Site Frontage', type: 'select', options: [] },
                { id: 'visibility', label: 'Visibility (commercial)', type: 'select', options: [] },
                { id: 'public_transport', label: 'Public Transport', type: 'select', options: [] },
                { id: 'infrastructure', label: 'Infrastructure Quality', type: 'select', options: [] },
                { id: 'parking', label: 'Free Parking', type: 'select', options: ['Yes', 'No'] },
                { id: 'pollution', label: 'Pollution Level', type: 'select', options: [] },
                { id: 'description', label: 'General Description', type: 'textarea' }
            ]
        },
        {
            key: 'valuation_photos',
            name: 'Photos',
            fields: [
                { id: 'photos', label: 'Property Photos', type: 'file', accept: ['image/jpeg', 'image/png'], multiple: true }
            ]
        },
        {
            key: 'valuation_legal',
            name: 'Legal Status',
            fields: [
                { id: 'identification_title', label: 'Identification Title', type: 'text' },
                { id: 'owner_rights', label: 'Owner Rights', type: 'text' },
                { id: 'risk_analysis', label: 'Risk Analysis', type: 'textarea' }
            ]
        },
        {
            key: 'valuation_technical',
            name: 'Technical Status',
            fields: []
        },
        {
            key: 'valuation_plot_features',
            name: 'Plot Features',
            fields: [
                { id: 'total_field_area', label: 'Total Field Area (sqm)', type: 'number' },
                { id: 'land_area_contract', label: 'Land Area Contract (sqm)', type: 'number' },
                { id: 'vertical_ownership_area', label: 'Vertical Ownership Area (sqm)', type: 'number' },
                { id: 'coownership_percentage', label: 'Co-ownership %', type: 'number' }
            ]
        },
        {
            key: 'valuation_building_features',
            name: 'Building Features',
            fields: [
                { id: 'floor', label: 'Floor', type: 'text' },
                { id: 'building_area', label: 'Area (sqm)', type: 'number' },
                { id: 'permit_year', label: 'Year of Permit', type: 'number' },
                { id: 'completion_year', label: 'Year of Completion', type: 'number' },
                { id: 'rooms', label: 'Number of Rooms', type: 'number' },
                { id: 'has_pool', label: 'Swimming Pool', type: 'select', options: ['Yes', 'No'] }
            ]
        },
        {
            key: 'valuation_urban_planning',
            name: 'Urban Planning Legality',
            fields: [
                { id: 'irreversible_violations', label: 'Irreversible Violations', type: 'select', options: ['Yes', 'No'] },
                { id: 'reversible_violations', label: 'Reversible Violations', type: 'select', options: ['Yes', 'No'] },
                { id: 'legality_risk_analysis', label: 'Risk Analysis', type: 'textarea' }
            ]
        },
        {
            key: 'valuation_esg',
            name: 'ESG Features',
            fields: [
                { id: 'green_works', label: 'Includes Green Works', type: 'select', options: ['Yes', 'No'] },
                { id: 'energy_performance', label: 'Energy Performance Category', type: 'text' },
                { id: 'co2_emissions', label: 'Annual CO2 Emissions', type: 'number' }
            ]
        },
        {
            key: 'valuation_assumptions',
            name: 'Assumptions',
            fields: [
                { id: 'assumptions', label: 'Assumptions / Special Assumptions', type: 'textarea' }
            ]
        }
    ]
};
function insertTemplate() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, data, error;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, supabase_1.supabase
                        .from('workflow_templates')
                        .insert([
                        {
                            key: template.key,
                            name: template.name,
                            stages: template.stages,
                            workstreams: template.workstreams,
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                        }
                    ])];
                case 1:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        console.error('Error inserting workflow template:', error);
                        process.exit(1);
                    }
                    console.log('Workflow template inserted successfully:', data);
                    process.exit(0);
                    return [2 /*return*/];
            }
        });
    });
}
insertTemplate();
