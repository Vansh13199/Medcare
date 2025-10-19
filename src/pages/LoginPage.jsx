import { SignIn } from "@clerk/clerk-react";

export default function LoginPage() {
  return (
    // 1. The Gradient Background
    // This div creates a full-screen gradient from blue, to purple, to pink.
    // It also centers the login form.
    <div className="min-h-screen flex items-center justify-center 
                    bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 p-4">
      
      {/* 2. The Clerk SignIn Component */}
      <SignIn 
        path="/sign-in" 
        routing="path" 
        appearance={{
          elements: {
            // 3. Make the main card more modern
            card: {
              borderRadius: '1.5rem', // Uses Tailwind's 'rounded-2xl'
              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)' // Uses Tailwind's 'shadow-2xl'
            },
            
            // 4. Style the primary button to match the gradient
            formButtonPrimary:
              'bg-purple-600 hover:bg-purple-700 text-sm normal-case',
            
            // 5. Style the "Sign in with Google" buttons
            socialButtonsBlockButton:
              'border-gray-200 hover:bg-gray-50'
          },
        }}
      />
    </div>
  );
}