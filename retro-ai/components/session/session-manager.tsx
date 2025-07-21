"use client";

import { useState, useEffect } from 'react';
import { useSessionManager } from '@/hooks/use-session-manager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  MapPin, 
  Clock, 
  Shield, 
  Trash2, 
  AlertTriangle,
  Activity,
  Users,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';

interface SessionManagerProps {
  showAnalytics?: boolean;
}

export function SessionManager({ showAnalytics = true }: SessionManagerProps) {
  const {
    sessions,
    currentSession,
    analytics,
    loading,
    error,
    loadSessions,
    loadAnalytics,
    terminateSession,
    terminateOtherSessions,
    clearError
  } = useSessionManager();

  const [terminating, setTerminating] = useState<string | null>(null);

  useEffect(() => {
    loadSessions();
    if (showAnalytics) {
      loadAnalytics();
    }
  }, [loadSessions, loadAnalytics, showAnalytics]);

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="h-4 w-4" />;
      case 'tablet':
        return <Tablet className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const formatLastActivity = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const handleTerminateSession = async (sessionId: string) => {
    setTerminating(sessionId);
    try {
      const success = await terminateSession(sessionId);
      if (success) {
        toast.success('Session terminated successfully');
      } else {
        toast.error('Failed to terminate session');
      }
    } catch {
      toast.error('Error terminating session');
    } finally {
      setTerminating(null);
    }
  };

  const handleTerminateOthers = async () => {
    setTerminating('others');
    try {
      const count = await terminateOtherSessions();
      if (count > 0) {
        toast.success(`${count} other sessions terminated`);
      } else {
        toast.info('No other sessions to terminate');
      }
    } catch {
      toast.error('Error terminating sessions');
    } finally {
      setTerminating(null);
    }
  };

  if (loading && sessions.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              className="ml-2" 
              onClick={clearError}
            >
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Analytics Summary */}
      {showAnalytics && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.activeSessions}</div>
              <p className="text-xs text-muted-foreground">
                Currently active across all devices
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.totalSessions}</div>
              <p className="text-xs text-muted-foreground">
                Last 30 days
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activities</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics.recentActivities.length}</div>
              <p className="text-xs text-muted-foreground">
                Actions tracked
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage your active sessions across all devices
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSessions}
                disabled={loading}
              >
                Refresh
              </Button>
              {sessions.length > 1 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleTerminateOthers}
                  disabled={terminating === 'others'}
                >
                  {terminating === 'others' ? 'Terminating...' : 'End Other Sessions'}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sessions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No active sessions found
              </div>
            ) : (
              sessions.map((session) => {
                const isCurrent = session.sessionId === currentSession?.sessionId;
                
                return (
                  <div
                    key={session.id}
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      isCurrent ? 'bg-primary/5 border-primary/20' : 'bg-background'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        {getDeviceIcon(session.deviceType)}
                        {isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">
                            {session.browserName} on {session.osName}
                          </span>
                          {session.location && (
                            <div className="flex items-center text-sm text-muted-foreground">
                              <MapPin className="h-3 w-3 mr-1" />
                              {session.location}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Last active {formatLastActivity(session.lastActivity)}
                          </div>
                          <div className="flex items-center">
                            <Shield className="h-3 w-3 mr-1" />
                            {session.ipAddress}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant={session.isActive ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {session.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      
                      {!isCurrent && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTerminateSession(session.sessionId)}
                          disabled={terminating === session.sessionId}
                          className="text-destructive hover:text-destructive"
                        >
                          {terminating === session.sessionId ? (
                            'Terminating...'
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {sessions.length > 0 && (
            <>
              <Separator className="my-4" />
              <div className="text-sm text-muted-foreground">
                <p>
                  Sessions automatically expire after 24 hours of inactivity. 
                  You can manually terminate sessions you no longer recognize.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Device Statistics */}
      {showAnalytics && analytics && Object.keys(analytics.deviceStats).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Device Usage</CardTitle>
            <CardDescription>
              Your login patterns across different device types
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(analytics.deviceStats).map(([device, count]) => (
                <div key={device} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {getDeviceIcon(device)}
                    <span className="capitalize">{device}</span>
                  </div>
                  <Badge variant="outline">
                    {count} session{count !== 1 ? 's' : ''}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}