# Turnkey - Real Estate Workflow Engine

Turnkey is a comprehensive real estate workflow management system that enables property teams to manage assets across multiple interconnected workflows. Built with React, TypeScript, and Tailwind CSS, it provides an intuitive interface for managing complex real estate processes.

## 🏗️ Core Features

### Workflow Management
- **Workflow Templates**: Pre-defined workflow structures for common real estate processes
- **Workflow Instances**: Property-specific workflow executions
- **Workstreams**: Parallel or linear sub-processes within workflows
- **Stage Tracking**: Detailed progress tracking for each workflow stage

### AI-Powered Assistant
- **Natural Language Processing**: Chat with AI to modify workflows
- **Workflow Modifications**: Add/remove workstreams and stages via conversation
- **Progress Summaries**: Get AI-generated summaries of workflow status
- **Smart Recommendations**: AI suggests workflow improvements

### Property Management
- **Property Registry**: Centralized property database
- **Financial Tracking**: Acquisition prices, current values, and appreciation
- **Status Management**: Track property lifecycle stages
- **Multi-Property Support**: Manage multiple properties simultaneously

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (recommended)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Turnkey
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=your-supabase-project-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

   # OpenAI Configuration
   VITE_OPENAI_API_KEY=your-openai-api-key
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to `http://localhost:5173`

## 📊 Database Schema

### Core Tables

#### Properties
```sql
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN ('residential', 'commercial', 'industrial', 'mixed')),
  square_feet INTEGER NOT NULL,
  units INTEGER NOT NULL,
  acquisition_date DATE,
  acquisition_price DECIMAL(15,2),
  current_value DECIMAL(15,2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'under_contract')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Workflow Templates
```sql
CREATE TABLE workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('acquisition', 'capex', 'lease_renewal', 'disposal', 'lease_up', 'auction_sales')),
  default_workstreams TEXT[],
  triggers TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Workflow Instances
```sql
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id),
  template_id UUID REFERENCES workflow_templates(id),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'paused', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🎯 Workflow Categories

### Acquisition
- Due Diligence
- Financing
- Legal Review
- Closing

### CapEx
- Planning
- Contractor Selection
- Construction
- Quality Assurance

### Lease Renewal
- Tenant Communication
- Negotiation
- Documentation
- Execution

### Lease-Up
- Marketing
- Tenant Screening
- Lease Execution
- Move-in Coordination

### Disposal
- Market Analysis
- Listing Preparation
- Buyer Outreach
- Closing

### Auction Sales
- Auction Preparation
- Marketing Campaign
- Bid Management
- Sale Execution

## 🤖 AI Assistant Usage

The AI assistant can help you with various workflow modifications:

### Adding Workstreams
```
"Add a legal review workstream to the acquisition workflow"
```

### Modifying Stages
```
"Add a property inspection stage before the financial analysis"
```

### Getting Summaries
```
"Give me a summary of the current workflow progress"
```

### Removing Components
```
"Remove the environmental review stage from the due diligence workstream"
```

## 🛠️ Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **UI Components**: Headless UI, Heroicons
- **Data Tables**: TanStack Table
- **Backend**: Supabase (PostgreSQL)
- **AI**: OpenAI GPT-4
- **Build Tool**: Vite

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── Sidebar.tsx     # Workflow template navigation
│   ├── PropertiesTable.tsx # Property listing table
│   ├── PropertyPanel.tsx   # Property details panel
│   ├── WorkstreamsTab.tsx  # Workstream management
│   └── ChatAssistantTab.tsx # AI chat interface
├── lib/                # Utility libraries
│   ├── supabase.ts     # Supabase client & database functions
│   ├── ai.ts          # OpenAI integration
│   └── mockData.ts    # Development mock data
├── types/              # TypeScript type definitions
│   └── index.ts       # Core type definitions
├── App.tsx            # Main application component
└── main.tsx           # Application entry point
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

### Code Style

The project uses:
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting
- Tailwind CSS for styling

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

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@turnkeyrealestate.com or create an issue in the GitHub repository.

---

Built with ❤️ for the real estate industry
