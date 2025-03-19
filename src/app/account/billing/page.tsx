import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Simplified version (Stripe integration removed)
export default function BillingPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Billing & Subscription</h1>
      
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            Subscription details
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Subscription Status</h3>
              <p className="text-sm text-muted-foreground">
                Free Plan
              </p>
            </div>
            
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                Stripe integration has been removed. All users currently have access to all features.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button disabled>
            Manage Subscription
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            View your past invoices and payment history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Payment functionality has been removed
          </p>
        </CardContent>
        <CardFooter>
          <Button disabled variant="outline">
            View Payment History
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}