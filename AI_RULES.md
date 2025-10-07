# AI Development Rules for Tunisia Ride Hub

## Tech Stack Overview

• **Frontend**: React 18 with TypeScript, Vite build tool, and React Router for navigation
• **UI Framework**: Tailwind CSS with shadcn/ui components for consistent design
• **Backend**: Supabase for database, authentication, and real-time functionality
• **Maps**: Mapbox GL JS for interactive mapping and location services
• **State Management**: React Context API with custom hooks for authentication and data management
• **Real-time Features**: Supabase Realtime for live updates on rides, driver locations, and chat
• **Payments**: Stripe integration for subscription management (driver premium features)
• **Authentication**: Supabase Auth with email/password and WebAuthn biometric support
• **Storage**: Supabase Storage for driver document uploads
• **Validation**: Zod for form and API data validation

## Library Usage Rules

### Maps & Location
- **Mapbox GL JS** is the only approved library for maps and location visualization
- Use the existing `Map` component for all map implementations
- All map API keys must be retrieved through the `get-maps-api-key` edge function

### UI Components
- **shadcn/ui** components must be used for all standard UI elements (buttons, cards, forms, etc.)
- **Tailwind CSS** is the only approved styling solution
- Custom components should extend shadcn/ui components rather than replacing them

### State Management
- Use **React Context API** for global state (authentication, language, theme)
- Implement **custom hooks** for reusable state logic (useAuth, useDriverLocations)
- Avoid external state management libraries like Redux or Zustand

### Data Fetching & Real-time
- **Supabase client** is the only approved data fetching library
- Use **Supabase Realtime** subscriptions for live data updates
- All database queries must go through the Supabase client

### Authentication
- Use **Supabase Auth** for all authentication flows
- Implement **WebAuthn** for biometric authentication using the existing backend functions
- Never store authentication tokens in local storage directly

### Forms & Validation
- Use **React Hook Form** for complex form handling
- Implement **Zod** for all validation schemas
- Follow the existing validation patterns in `src/lib/validation.ts`

### Payments
- Use **Stripe** for all payment processing through the existing edge functions
- Never handle payment information directly in the frontend
- All payment flows must go through Supabase edge functions

### Notifications
- Use **browser Notification API** for system notifications with permission handling
- Use **sonner** or **shadcn toast** for in-app notifications
- Implement both visual and system notifications for important ride status changes

### Routing
- Use **React Router** for all navigation
- Follow the existing route structure in `src/App.tsx`
- Implement protected routes using the existing auth context

### Data Types
- Use **TypeScript interfaces** defined in `src/lib/types.ts` for all data models
- Extend existing types rather than creating duplicates
- Implement proper type checking for all API responses

### Internationalization
- Use the existing **language context** from `useAuth` hook
- Add translations to component-specific translation objects
- Support all three languages: English, French, and Arabic

### Security
- Never expose Supabase service role keys in frontend code
- Use Supabase RLS (Row Level Security) for data protection
- Implement proper error handling without exposing sensitive information
- Use environment variables for all secrets through Supabase edge functions