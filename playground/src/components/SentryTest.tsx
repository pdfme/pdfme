import React from 'react';

const SentryTest: React.FC = () => {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
      <h3 className="text-red-600 font-medium mb-2">Sentry Test</h3>
      <button 
        onClick={() => { throw new Error("This is your first error!"); }}
        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
      >
        Break the world
      </button>
    </div>
  );
};

export default SentryTest;
