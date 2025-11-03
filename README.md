# PropertyFlow - UK Property Management for Landlords

PropertyFlow is a comprehensive property management system designed specifically for UK residential landlords, with support for Greece and USA markets. Built with React, TypeScript, and Tailwind CSS, it provides an intuitive interface for managing rental properties, tenants, and UK compliance requirements.

## 🇬🇧 UK-Focused Features

PropertyFlow is built with UK landlords in mind, including:

- **Full UK Compliance Tracking** - All 10 mandatory certificates and checks
- **HMO Support** - Complete HMO licensing and multi-unit management
- **UK Terminology** - Postcodes, council tax, letting agents, deposit protection
- **Deposit Rules** - 5-week deposit cap (Tenant Fees Act 2019)
- **Right to Rent** - Built-in Right to Rent checking workflow
- **Gov.uk Integration** - Links to official guidance and resources

### Additional Country Support
- 🇬🇷 **Greece** (Basic support with expansion planned)
- 🇺🇸 **USA** (Basic support with expansion planned)

[→ Read Multi-Country Setup Guide](./MULTI_COUNTRY_SETUP.md)

## 🏠 Core Features

### Property Management
- **Portfolio Overview**: Track all your rental properties in one dashboard
- **HMO Support**: Full support for Houses in Multiple Occupation with individual unit management
- **Financial Tracking**: Monitor purchase prices, rental income, and property expenses
- **Occupancy Status**: Real-time tracking of vacant, occupied, and maintenance properties
- **Multi-Country**: Manage properties across UK, Greece, and USA

### Tenant Management
- **Complete Tenant Database**: Store all tenant information and contact details
- **Lease Tracking**: Monitor lease agreements, start dates, and rental amounts
- **Rent Collection**: Track payments and identify overdue accounts
- **Right to Rent**: UK Right to Rent compliance tracking
- **Deposit Protection**: Track UK deposit protection schemes
- **Agent Support**: Record which tenants were found via letting agents

### UK Compliance Management
Track all mandatory UK landlord requirements:

1. ✅ **Gas Safety Certificate** (Annual)
2. ✅ **EICR** - Electrical Installation Condition Report (5 years)
3. ✅ **EPC** - Energy Performance Certificate (10 years, min rating E)
4. ✅ **Deposit Protection** (Within 30 days)
5. ✅ **Right to Rent Checks** (Before tenancy)
6. ✅ **Legionella Risk Assessment**
7. ✅ **Smoke Alarm Certificate**
8. ✅ **Carbon Monoxide Alarm Certificate**
9. ✅ **Fire Safety Certificate** (HMO)
10. ✅ **HMO License** (5 years)

**Automated Reminders:** Never miss a renewal deadline  
[→ Read Full UK Compliance Guide](./UK_COMPLIANCE_GUIDE.md)

### Maintenance & Operations
- **Inspection Scheduling**: Plan routine, move-in, and move-out inspections
- **Repair Management**: Log and track maintenance requests
- **Expense Tracking**: Record all property-related expenses
- **Contractor Database**: Maintain preferred supplier information

### User Types Supported

PropertyFlow supports three distinct user workflows:

1. **Direct Landlords** - Self-managing landlords with full control
2. **Agent-Using Landlords** - Use letting agents, maintain oversight
3. **Property Managers** - Professionals managing for multiple landlords

[→ Read User Types Guide](./USER_TYPES.md)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (recommended)
- npm or yarn
- Supabase account (for database)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/skopd9/baseprop.git
   cd baseprop
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the root directory:
   ```env
   # Supabase Configuration (Required)
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

   # Optional - For AI features
   VITE_OPENAI_API_KEY=your-openai-api-key
   
   # Optional - For maps (future use)
   VITE_GOOGLE_MAPS_API_KEY=your-google-maps-key
   ```

4. **Set up the database**
   
   Run the database schema in your Supabase SQL editor:
   ```bash
   # Copy contents of uk_landlord_schema.sql
   # Paste into Supabase SQL Editor
   # Execute
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   
   Navigate to `http://localhost:5173`

## 📊 Database Schema

### Core Tables

- **properties** - Property details with UK-specific fields
- **tenants** - Tenant information and tenancy details
- **rent_payments** - Rent payment tracking
- **compliance_certificates** - All compliance documentation
- **inspections** - Property inspection records
- **repairs** - Maintenance and repair tracking
- **expenses** - Property expense records
- **agents** - Letting agent information
- **user_preferences** - User country and type preferences

See `uk_landlord_schema.sql` for complete schema.

## 🎯 Key Workflows

### For Direct Landlords

1. **Property Setup**
   - Add property with UK postcode
   - Enter council tax band
   - Upload existing certificates
   - Set up compliance reminders

2. **Tenant Onboarding**
   - Perform Right to Rent check
   - Create tenancy agreement
   - Protect deposit (within 30 days)
   - Provide "How to Rent" guide

3. **Ongoing Management**
   - Track monthly rent payments
   - Schedule routine inspections
   - Log maintenance requests
   - Monitor compliance renewals

### For Agent-Using Landlords

1. **Add Your Agent**
   - Record agent details
   - Note services provided
   - Track commission structure

2. **Property Oversight**
   - Link properties to agents
   - Monitor rent collection
   - Review compliance status
   - Track agent fees

3. **Financial Monitoring**
   - Review monthly statements
   - Track net returns
   - Monitor expenses
   - Evaluate agent performance

### For Property Managers

1. **Portfolio Management**
   - Add multiple landlord properties
   - Tag properties by owner
   - Bulk operations support
   - Multi-property reporting

2. **Tenant Management**
   - Centralized tenant database
   - Systematic inspection schedules
   - Compliance calendar management
   - Contractor coordination

3. **Landlord Reporting**
   - Generate owner statements
   - Compliance status reports
   - Financial summaries
   - Performance analytics

## 🤖 AI Voice Assistant

PropertyFlow includes an AI-powered voice assistant to help with:
- Property queries ("Show me all vacant properties")
- Compliance reminders ("When is the gas safety due?")
- Tenant information ("Which tenants have overdue rent?")
- Quick navigation and support

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **UI Components**: Headless UI, Heroicons
- **Data Tables**: TanStack Table
- **Backend**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4 (optional)
- **Maps**: Google Maps, Deck.gl, Mapbox (for future features)
- **Build Tool**: Vite

## 📁 Project Structure

```
src/
├── components/         # React components
│   ├── SimplifiedLandlordApp.tsx       # Main application
│   ├── SimplifiedDashboard.tsx         # Dashboard overview
│   ├── ResidentialPropertiesTable.tsx  # Property management
│   ├── ResidentialTenantsTable.tsx     # Tenant management
│   ├── ComplianceWorkflows.tsx         # UK compliance tracking
│   ├── RentTracking.tsx                # Rent collection
│   ├── ExpenseTracker.tsx              # Expense tracking
│   ├── InspectionWorkflows.tsx         # Inspections
│   ├── RepairWorkflows.tsx             # Repairs
│   ├── QuickStartGuide.tsx             # User guidance
│   └── ...
├── services/          # Business logic
│   ├── SimplifiedPropertyService.ts
│   ├── SimplifiedTenantService.ts
│   ├── ExpenseService.ts
│   └── ...
├── lib/               # Core libraries
│   ├── supabase.ts                     # Database client
│   ├── countries.ts                    # Multi-country config
│   ├── formatters.ts                   # Country-specific formatting
│   └── ai.ts                           # AI integration (optional)
├── types/             # TypeScript types
│   └── index.ts
├── utils/             # Utility functions
│   ├── simplifiedDataTransforms.ts
│   └── demoDataSeeder.ts
├── App.tsx           # Application entry
└── main.tsx          # React bootstrap
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

- TypeScript for type safety
- ESLint for code linting
- Tailwind CSS for styling
- Functional components with hooks

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Netlify

1. Connect your GitHub repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `dist`
4. Configure environment variables

### Environment Variables for Production

Ensure these are set in your deployment platform:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_OPENAI_API_KEY` (if using AI features)
- `VITE_GOOGLE_MAPS_API_KEY` (if using maps)

## 📚 Documentation

- [UK Compliance Guide](./UK_COMPLIANCE_GUIDE.md) - Complete UK landlord compliance requirements
- [User Types Guide](./USER_TYPES.md) - Direct landlords, agent-using landlords, property managers
- [Multi-Country Setup](./MULTI_COUNTRY_SETUP.md) - UK, Greece, USA support
- [HMO Functionality Guide](./HMO_FUNCTIONALITY_GUIDE.md) - HMO management features
- [Expenses Feature Guide](./EXPENSES_FEATURE_GUIDE.md) - Expense tracking
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ⚖️ Legal Compliance

PropertyFlow is a tool to help you manage your properties and track compliance. You are responsible for:
- Understanding and following all UK landlord laws
- Keeping all certificates current
- Following proper legal procedures
- Consulting with legal professionals when needed

**Important:** Laws change frequently. Always verify requirements with official government sources and legal professionals.

## 🆘 Support

- **Documentation**: Check the guides above
- **Issues**: Create a GitHub issue
- **Email**: support@propertyflow.com
- **Community**: Join our landlord community forum

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Getting Started Checklist

For new UK landlords:

- [ ] Sign up for PropertyFlow
- [ ] Select "United Kingdom" as your country
- [ ] Choose your user type (Direct/Agent-Using/Property Manager)
- [ ] Add your first property
- [ ] Upload existing compliance certificates
- [ ] Set up automated renewal reminders
- [ ] Add your tenants
- [ ] Protect tenant deposits (within 30 days)
- [ ] Review UK Compliance Guide
- [ ] Set up monthly rent tracking

## 🔮 Roadmap

### Near Term
- [ ] Enhanced mobile app
- [ ] Tenant portal
- [ ] Automated rent collection
- [ ] Digital tenancy agreements
- [ ] Enhanced Greece & USA support

### Future
- [ ] Accounting software integration (Xero, QuickBooks)
- [ ] Bank feed integration
- [ ] Advanced reporting and analytics
- [ ] Portfolio performance metrics
- [ ] Additional country support (Ireland, Australia, France)

---

**Built with ❤️ for UK landlords**

*Helping landlords stay compliant, organized, and successful.*
