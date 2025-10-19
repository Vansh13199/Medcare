import React from 'react';
import { NavLink } from 'react-router-dom'; // Make sure NavLink is imported
import { UserButton } from '@clerk/clerk-react';

export default function Navbar() {
  
  // This function is used by NavLink to apply conditional styling
  const getNavLinkClass = ({ isActive }) => {
    return isActive
      ? 'bg-purple-800 text-white px-3 py-2 rounded-md text-sm font-medium' // Active link style
      : 'text-purple-100 hover:bg-purple-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium'; // Inactive link style
  };

  return (
    <nav className="bg-gradient-to-r from-purple-600 to-blue-600 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo and Main Nav */}
          <div className="flex items-center">
            
            {/* --- ⭐️ UPDATED: Logo is now a NavLink --- */}
            <NavLink to="/" className="flex-shrink-0">
              <span className="text-2xl font-bold text-white">
                MedCare
              </span>
            </NavLink>
            {/* --- End of Update --- */}
            
            {/* Navigation Links */}
            
          </div>
          
          {/* Right side: User Button (unchanged) */}
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              <UserButton afterSignOutUrl="/" />
            </div>
          </div>
          
          {/* Mobile Menu Button (unchanged) */}
          <div className="-mr-2 flex md:hidden">
            <button className="bg-purple-700 inline-flex items-center justify-center p-2 rounded-md text-purple-200 hover:text-white hover:bg-purple-800">
              <span className="sr-only">Open main menu</span>
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" />
              </svg>
            </button>
          </div>
          
        </div>
      </div>
    </nav>
  );
}