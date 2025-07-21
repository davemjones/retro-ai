"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/lib/socket-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Wifi, 
  WifiOff,
  RefreshCw,
  Heart
} from 'lucide-react';
import { toast } from 'sonner';

interface SessionAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  message: string;
  timestamp: number;
}

export function SocketSessionMonitor() {
  const { 
    isConnected, 
    sessionId, 
    sendHeartbeat, 
    forceSessionRefresh,
    onSessionEvent,
    onAuthFailed,
    onOperationFailed,
    onAccessDenied,
    onHeartbeatResponse
  } = useSocket();

  const [alerts, setAlerts] = useState<SessionAlert[]>([]);
  const [heartbeatStatus, setHeartbeatStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');
  const [lastHeartbeat, setLastHeartbeat] = useState<number | null>(null);
  const [sessionHealth, setSessionHealth] = useState<'healthy' | 'warning' | 'critical'>('healthy');
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add alerts - wrapped in useCallback to prevent dependency changes
  const addAlert = useCallback((type: SessionAlert['type'], message: string) => {
    const alert: SessionAlert = {
      id: Date.now().toString(),
      type,
      message,
      timestamp: Date.now(),
    };
    setAlerts(prev => [alert, ...prev].slice(0, 10)); // Keep only 10 most recent
  }, []);

  // Set up socket event listeners
  useEffect(() => {
    const unsubscribers: (() => void)[] = [];

    // Session events from server
    const unsubscribeSessionEvent = onSessionEvent((data) => {
      console.log('Session event received:', data);
      
      switch (data.type) {
        case 'session-warning':
          addAlert('warning', `Session Warning: ${data.data.message || 'Unknown warning'}`);
          setSessionHealth('warning');
          toast.warning('Session Warning', {
            description: data.data.message as string || 'Unknown warning',
          });
          break;
        case 'session-security-alert':
          addAlert('error', `Security Alert: ${data.data.message || 'Security issue detected'}`);
          setSessionHealth('critical');
          toast.error('Security Alert', {
            description: data.data.message as string || 'Security issue detected',
          });
          break;
        case 'session-update':
          addAlert('info', `Session Update: ${data.data.message || 'Session updated'}`);
          break;
      }
    });

    // Authentication failures
    const unsubscribeAuthFailed = onAuthFailed((data) => {
      addAlert('error', `Authentication Failed: ${data.reason}`);
      setSessionHealth('critical');
      toast.error('Authentication Failed', {
        description: data.reason,
      });
    });

    // Operation failures
    const unsubscribeOperationFailed = onOperationFailed((data) => {
      addAlert('warning', `Operation Failed: ${data.operation} - ${data.reason}`);
      setSessionHealth('warning');
      toast.warning('Operation Failed', {
        description: `${data.operation}: ${data.reason}`,
      });
    });

    // Access denied
    const unsubscribeAccessDenied = onAccessDenied((data) => {
      addAlert('error', `Access Denied: ${data.resource} - ${data.reason}`);
      setSessionHealth('warning');
      toast.error('Access Denied', {
        description: `${data.resource}: ${data.reason}`,
      });
    });

    unsubscribers.push(
      unsubscribeSessionEvent,
      unsubscribeAuthFailed,
      unsubscribeOperationFailed,
      unsubscribeAccessDenied
    );

    return () => {
      unsubscribers.forEach(unsubscribe => unsubscribe());
    };
  }, [onSessionEvent, onAuthFailed, onOperationFailed, onAccessDenied, addAlert]);

  // Periodic heartbeat
  useEffect(() => {
    if (!isConnected) return;

    const heartbeatInterval = setInterval(() => {
      setHeartbeatStatus('pending');
      sendHeartbeat();
      
      // Clear any existing timeout
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
      
      // Set a new timeout for heartbeat response
      heartbeatTimeoutRef.current = setTimeout(() => {
        setHeartbeatStatus((currentStatus) => {
          if (currentStatus === 'pending') {
            addAlert('warning', 'Heartbeat timeout - session may be unstable');
            setSessionHealth('warning');
            return 'failed';
          }
          return currentStatus;
        });
        heartbeatTimeoutRef.current = null;
      }, 5000);
    }, 30000); // Send heartbeat every 30 seconds

    return () => {
      clearInterval(heartbeatInterval);
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }
    };
  }, [isConnected, sendHeartbeat, addAlert]);

  // Handle heartbeat responses
  useEffect(() => {
    if (!isConnected) return;

    // Listen for heartbeat response from server
    const unsubscribeHeartbeat = onHeartbeatResponse((data) => {
      console.log('Heartbeat response received:', data);
      
      // Clear the heartbeat timeout since we got a response
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }
      
      if (data.isValid) {
        setHeartbeatStatus('success');
        setLastHeartbeat(Date.now());
        
        // Reset session health if it was warning due to heartbeat
        if (sessionHealth === 'warning') {
          setSessionHealth('healthy');
        }
      } else {
        setHeartbeatStatus('failed');
        addAlert('error', 'Heartbeat response indicates invalid session');
        setSessionHealth('critical');
      }
    });

    return unsubscribeHeartbeat;
  }, [isConnected, onHeartbeatResponse, sessionHealth, addAlert]);

  const handleManualHeartbeat = () => {
    setHeartbeatStatus('pending');
    sendHeartbeat();
    addAlert('info', 'Manual heartbeat sent');
    
    // Clear any existing timeout
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    
    // Set timeout for manual heartbeat
    heartbeatTimeoutRef.current = setTimeout(() => {
      setHeartbeatStatus((currentStatus) => {
        if (currentStatus === 'pending') {
          addAlert('warning', 'Manual heartbeat timeout - session may be unstable');
          setSessionHealth('warning');
          return 'failed';
        }
        return currentStatus;
      });
      heartbeatTimeoutRef.current = null;
    }, 5000);
  };

  const handleForceRefresh = () => {
    forceSessionRefresh();
    addAlert('info', 'Session refresh requested');
    toast.info('Session Refresh', {
      description: 'Requesting session refresh...',
    });
  };

  const clearAlerts = () => {
    setAlerts([]);
  };

  const getConnectionIcon = () => {
    if (!isConnected) return <WifiOff className="h-4 w-4 text-red-500" />;
    
    switch (sessionHealth) {
      case 'healthy':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <Wifi className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <WifiOff className="h-4 w-4 text-red-500" />;
      default:
        return <Wifi className="h-4 w-4 text-gray-500" />;
    }
  };

  const getHeartbeatIcon = () => {
    switch (heartbeatStatus) {
      case 'success':
        return <Heart className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Heart className="h-4 w-4 text-yellow-500 animate-pulse" />;
      default:
        return <Heart className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5" />
            <CardTitle className="text-lg">Real-time Session Monitor</CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {getConnectionIcon()}
            <Badge 
              variant={isConnected ? 'default' : 'destructive'}
              className="text-xs"
            >
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Monitor socket session health and security events in real-time
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Session Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span className="text-sm font-medium">Session Health:</span>
            <Badge 
              variant={
                sessionHealth === 'healthy' ? 'default' : 
                sessionHealth === 'warning' ? 'secondary' : 'destructive'
              }
            >
              {sessionHealth}
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            {getHeartbeatIcon()}
            <span className="text-sm font-medium">Heartbeat:</span>
            <span className="text-sm text-muted-foreground">
              {lastHeartbeat 
                ? `${Math.round((Date.now() - lastHeartbeat) / 1000)}s ago`
                : 'Never'
              }
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Session ID:</span>
            <span className="text-xs font-mono bg-muted px-2 py-1 rounded">
              {sessionId ? `${sessionId.substring(0, 8)}...` : 'None'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleManualHeartbeat}
            disabled={!isConnected}
          >
            <Heart className="h-4 w-4 mr-1" />
            Heartbeat
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handleForceRefresh}
            disabled={!isConnected}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh Session
          </Button>
          {alerts.length > 0 && (
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={clearAlerts}
            >
              Clear Alerts
            </Button>
          )}
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center">
              <AlertTriangle className="h-4 w-4 mr-1" />
              Recent Alerts ({alerts.length})
            </h4>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {alerts.map((alert) => (
                <Alert 
                  key={alert.id} 
                  variant={alert.type === 'error' ? 'destructive' : 'default'}
                  className="py-2"
                >
                  <AlertDescription className="text-xs">
                    <div className="flex justify-between items-start">
                      <span>{alert.message}</span>
                      <span className="text-muted-foreground ml-2">
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {!isConnected && (
          <Alert variant="destructive">
            <WifiOff className="h-4 w-4" />
            <AlertDescription>
              Socket connection lost. Real-time features may not work properly. 
              Please refresh the page if the connection does not restore automatically.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}