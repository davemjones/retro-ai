"use client";

import { SessionManager } from '@/components/session/session-manager';
import { SocketSessionMonitor } from '@/components/session/socket-session-monitor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Users, Settings as SettingsIcon, Wifi } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sessions" className="flex items-center space-x-2">
            <Users className="h-4 w-4" />
            <span>Sessions</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="realtime" className="flex items-center space-x-2">
            <Wifi className="h-4 w-4" />
            <span>Real-time</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Session Management</CardTitle>
                <CardDescription>
                  Monitor and control your active sessions across all devices. 
                  This helps you maintain security and see where you&apos;re logged in.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <SessionManager showAnalytics={true} />
          </div>
        </TabsContent>

        <TabsContent value="security">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security preferences and view security events.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Coming soon
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Session Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Get notified when someone logs into your account
                      </p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Coming soon
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Automatic Session Cleanup</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically end inactive sessions after 7 days
                      </p>
                    </div>
                    <div className="text-sm text-green-600">
                      Enabled
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>


        <TabsContent value="realtime">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Real-time Session Monitoring</CardTitle>
                <CardDescription>
                  Monitor your active socket connections and real-time session security.
                </CardDescription>
              </CardHeader>
            </Card>
            
            <SocketSessionMonitor />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}