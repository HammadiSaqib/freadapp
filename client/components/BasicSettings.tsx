import React from "react";

interface BasicSettingsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  children?: React.ReactNode;
}

export default function BasicSettings(props: BasicSettingsProps) {
  const { children, activeTab, setActiveTab } = props;

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6 bg-white border border-gray-300">
      
      {/* Header */}
      <div className="border-b border-gray-300 pb-4 mb-4">
        <h1 className="text-xl font-bold text-gray-900 uppercase">System Settings</h1>
        <p className="text-sm text-gray-600">Standard Configuration</p>
      </div>

      <div className="border border-gray-300 bg-gray-50">
        <div className="bg-gray-100 border-b border-gray-300 p-3">
          <h2 className="text-sm font-bold text-gray-800 uppercase">Preferences</h2>
        </div>
        
        {/* Settings Navigation (if any) could go here. 
            Currently, settings might use children to render its own tabs or content. 
            If the parent passes tabs via children, we wrap it in a basic container. */}
        <div className="p-6 bg-white w-full">
          {children}
        </div>
      </div>

    </div>
  );
}
