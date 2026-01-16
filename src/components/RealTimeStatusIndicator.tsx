import React, { useState, useEffect } from 'react';
import { 
  WifiIcon, 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

interface RealTimeStatusIndicatorProps {
  onManualRefresh?: () => void;
  className?: string;
}

interface ConnectionStatus {
  connected: boolean;
  reconnectAttempts: number;
  activeChannels: number;
  activeSubscriptions: number;
  lastUpdate?: Date;
}

export const RealTimeStatusIndicator: React.FC<RealTimeStatusIndicatorProps> = ({
  onManualRefresh,
  className = ''
}) => {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    connected: true,
    reconnectAttempts: 0,
    activeChannels: 0,
    activeSubscriptions: 0
  });
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Check connection status periodically
  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Import real-time service dynamically
        const { realTimeNavigationService } = await import('../services/RealTimeNavigationService');
        const status = realTimeNavigationService.getConnectionStatus();
        setConnectionStatus({
          ...status,
          lastUpdate: new Date()
        });
      } catch (error) {
        console.error('Error checking connection status:', error);
        setConnectionStatus(prev => ({
          ...prev,
          connected: false
        }));
      }
    };

    // Check immediately
    checkStatus();

    // Check every 10 seconds
    const interval = setInterval(checkStatus, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      if (onManualRefresh) {
        await onManualRefresh();
      }
      
      // Also trigger real-time service refresh
      const { realTimeNavigationService } = await import('../services/RealTimeNavigationService');
      await realTimeNavigationService.triggerNavigationRefresh();
      
    } catch (error) {
      console.error('Error during manual refresh:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = () => {
    if (isRefreshing) {
      return <ArrowPathIcon className="w-4 h-4 animate-spin text-blue-500" />;
    }
    
    if (!connectionStatus.connected) {
      return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
    }
    
    if (connectionStatus.reconnectAttempts > 0) {
      return <WifiIcon className="w-4 h-4 text-yellow-500" />;
    }
    
    return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
  };

  const getStatusText = () => {
    if (isRefreshing) return 'Refreshing...';
    if (!connectionStatus.connected) return 'Disconnected';
    if (connectionStatus.reconnectAttempts > 0) return 'Reconnecting...';
    return 'Connected';
  };

  const getStatusColor = () => {
    if (isRefreshing) return 'text-blue-600';
    if (!connectionStatus.connected) return 'text-red-600';
    if (connectionStatus.reconnectAttempts > 0) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className={`relative ${className}`}>
      <div 
        className="flex items-center space-x-2 cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        {getStatusIcon()}
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleManualRefresh();
          }}
          disabled={isRefreshing}
          className="p-1 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
          title="Manual refresh"
        >
          <ArrowPathIcon className={`w-3 h-3 text-gray-500 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Status Details Tooltip */}
      {showDetails && (
        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50">
          <div className="text-xs space-y-2">
            <div className="font-medium text-gray-900 border-b border-gray-100 pb-1">
              Real-Time Status
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-gray-600">
              <div>Connection:</div>
              <div className={connectionStatus.connected ? 'text-green-600' : 'text-red-600'}>
                {connectionStatus.connected ? 'Active' : 'Inactive'}
              </div>
              
              <div>Channels:</div>
              <div>{connectionStatus.activeChannels}</div>
              
              <div>Subscriptions:</div>
              <div>{connectionStatus.activeSubscriptions}</div>
              
              {connectionStatus.reconnectAttempts > 0 && (
                <>
                  <div>Reconnect Attempts:</div>
                  <div className="text-yellow-600">{connectionStatus.reconnectAttempts}</div>
                </>
              )}
              
              {connectionStatus.lastUpdate && (
                <>
                  <div>Last Check:</div>
                  <div>{connectionStatus.lastUpdate.toLocaleTimeString()}</div>
                </>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="w-full px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors disabled:opacity-50"
              >
                {isRefreshing ? 'Refreshing...' : 'Force Refresh'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Hook for using real-time status in components
export const useRealTimeStatus = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    connected: true,
    reconnectAttempts: 0,
    activeChannels: 0,
    activeSubscriptions: 0
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { realTimeNavigationService } = await import('../services/RealTimeNavigationService');
        const currentStatus = realTimeNavigationService.getConnectionStatus();
        setStatus(currentStatus);
      } catch (error) {
        console.error('Error checking real-time status:', error);
        setStatus(prev => ({ ...prev, connected: false }));
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  return status;
};