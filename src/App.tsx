import React from 'react';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center relative overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>
      
      {/* Main content */}
      <div className="relative z-10 text-center">
        <h1 className="text-8xl md:text-9xl lg:text-[12rem] font-bold tracking-wider text-white drop-shadow-2xl">
          <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent animate-pulse-slow">
            REOS
          </span>
        </h1>
        
        {/* Subtle glow effect */}
        <div className="absolute inset-0 blur-3xl opacity-30">
          <h1 className="text-8xl md:text-9xl lg:text-[12rem] font-bold tracking-wider text-purple-400">
            REOS
          </h1>
        </div>
      </div>
      
      {/* Floating particles */}
      <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white rounded-full opacity-20 animate-bounce delay-1000"></div>
      <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-purple-300 rounded-full opacity-30 animate-bounce delay-2000"></div>
      <div className="absolute top-1/2 left-1/6 w-1.5 h-1.5 bg-white rounded-full opacity-25 animate-bounce delay-3000"></div>
      <div className="absolute bottom-1/4 right-1/3 w-1 h-1 bg-purple-200 rounded-full opacity-20 animate-bounce delay-4000"></div>
    </div>
  );
}

export default App;