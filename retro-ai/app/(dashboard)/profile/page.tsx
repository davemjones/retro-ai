"use client";

import { useSession } from '@/components/providers/better-auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils';
import { User, Calendar, Mail, CheckCircle, XCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Type definition for user with additional color property
type UserWithColor = {
  id: string;
  email: string;
  name?: string;
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
  color?: string | null;
};

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const loading = status === 'loading';

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'Unknown';
    const dateObj = new Date(date);
    return dateObj.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  const formatRelativeTime = (date: string | Date | undefined) => {
    if (!date) return '';
    const dateObj = new Date(date);
    const now = new Date();
    const diff = now.getTime() - dateObj.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) return `${years} year${years > 1 ? 's' : ''} ago`;
    if (months > 0) return `${months} month${months > 1 ? 's' : ''} ago`;
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    return 'Today';
  };

  if (loading) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Profile</h1>
          </div>
          
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <div className="h-8 w-48 bg-muted animate-pulse rounded" />
                <div className="h-4 w-64 bg-muted animate-pulse rounded mt-2" />
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="h-20 w-20 bg-muted animate-pulse rounded-full" />
                  <div className="space-y-2">
                    <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!loading && !session) {
    return (
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto p-6 space-y-6">
          <div className="flex items-center space-x-2">
            <User className="h-6 w-6" />
            <h1 className="text-3xl font-bold">Profile</h1>
          </div>
          
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                Please sign in to view your profile.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!session) {
    return null; // This shouldn't happen but satisfies TypeScript
  }

  const user = session.user;
  const userName = user.name || 'Not set';
  const userEmail = user.email;
  const emailVerified = user.emailVerified || false;
  const createdAt = user.createdAt;

  return (
    <div className="h-full overflow-y-auto">
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center space-x-2">
          <User className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Profile</h1>
        </div>

        <div className="grid gap-6">
          {/* Profile Overview Card */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>
                Your personal information and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar and Name Section */}
              <div className="flex items-center space-x-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user.image || undefined} alt={userName} />
                  <AvatarFallback className="text-lg font-semibold" color={(user as UserWithColor).color || undefined}>
                    {getInitials(userName)}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h2 className="text-2xl font-semibold">{userName}</h2>
                  <p className="text-sm text-muted-foreground">{userEmail}</p>
                </div>
              </div>

              {/* User Details Grid */}
              <div className="grid gap-4 pt-4 border-t">
                {/* Name Field */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="flex items-center text-sm font-medium text-muted-foreground">
                    <User className="h-4 w-4 mr-2" />
                    Display Name
                  </div>
                  <div className="sm:col-span-2 text-sm">
                    {userName}
                  </div>
                </div>

                {/* Email Field */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="flex items-center text-sm font-medium text-muted-foreground">
                    <Mail className="h-4 w-4 mr-2" />
                    Email Address
                  </div>
                  <div className="sm:col-span-2 text-sm flex items-center gap-2">
                    <span>{userEmail}</span>
                    {emailVerified ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-orange-600 border-orange-600">
                        <XCircle className="h-3 w-3" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Account Created Field */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
                  <div className="flex items-center text-sm font-medium text-muted-foreground">
                    <Calendar className="h-4 w-4 mr-2" />
                    Account Created
                  </div>
                  <div className="sm:col-span-2 text-sm">
                    <div>{formatDate(createdAt)}</div>
                    <div className="text-xs text-muted-foreground">
                      Joined {formatRelativeTime(createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}