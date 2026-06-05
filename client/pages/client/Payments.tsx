import { useState, useEffect } from "react";
import ClientLayout from "@/components/ClientLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  CreditCard,
  DollarSign,
  Calendar as CalendarIcon,
  CheckCircle,
  AlertCircle,
  Clock,
  Plus,
  Filter,
  Download,
} from "lucide-react";

export default function Payments() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Mock data for payments
  const upcomingPayments = [
    {
      id: 1,
      account: "Chase Freedom",
      amount: 125.00,
      dueDate: "2024-01-25",
      status: "Scheduled",
      type: "Minimum Payment",
    },
    {
      id: 2,
      account: "Capital One Venture",
      amount: 200.00,
      dueDate: "2024-01-28",
      status: "Pending",
      type: "Full Balance",
    },
    {
      id: 3,
      account: "Wells Fargo Auto Loan",
      amount: 385.50,
      dueDate: "2024-02-01",
      status: "Scheduled",
      type: "Monthly Payment",
    },
  ];

  const paymentHistory = [
    {
      id: 1,
      account: "Chase Freedom",
      amount: 125.00,
      date: "2024-01-15",
      status: "Completed",
      type: "Minimum Payment",
    },
    {
      id: 2,
      account: "Capital One Venture",
      amount: 180.00,
      date: "2024-01-10",
      status: "Completed",
      type: "Partial Payment",
    },
    {
      id: 3,
      account: "Wells Fargo Auto Loan",
      amount: 385.50,
      date: "2024-01-01",
      status: "Completed",
      type: "Monthly Payment",
    },
    {
      id: 4,
      account: "Discover It",
      amount: 50.00,
      date: "2023-12-20",
      status: "Failed",
      type: "Minimum Payment",
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "Scheduled":
        return "bg-blue-100 text-blue-800";
      case "Pending":
        return "bg-yellow-100 text-yellow-800";
      case "Failed":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Completed":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "Scheduled":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "Pending":
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      case "Failed":
        return <AlertCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <ClientLayout 
      title="Payments" 
      description="Manage your payment history and schedule future payments"
    >
      <div className="space-y-6">
        {/* Payment Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">$710.50</div>
              <p className="text-xs text-muted-foreground">
                Total payments due
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingPayments.length}</div>
              <p className="text-xs text-muted-foreground">
                Payments scheduled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Time Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">95%</div>
              <p className="text-xs text-muted-foreground">
                Last 12 months
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Auto Pay</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2</div>
              <p className="text-xs text-muted-foreground">
                Accounts enrolled
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Payments */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Upcoming Payments</CardTitle>
                    <CardDescription>
                      Scheduled and pending payments for your accounts
                    </CardDescription>
                  </div>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Schedule Payment
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingPayments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold">{payment.account}</h3>
                          <p className="text-sm text-muted-foreground">{payment.type}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-semibold">${payment.amount.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">Due {payment.dueDate}</p>
                        </div>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Payment History */}
            <Card className="mt-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Payment History</CardTitle>
                    <CardDescription>
                      Recent payment transactions and their status
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Filter className="h-4 w-4 mr-2" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentHistory.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(payment.status)}
                        <div>
                          <h3 className="font-semibold">{payment.account}</h3>
                          <p className="text-sm text-muted-foreground">{payment.type}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-semibold">${payment.amount.toFixed(2)}</p>
                          <p className="text-sm text-muted-foreground">{payment.date}</p>
                        </div>
                        <Badge className={getStatusColor(payment.status)}>
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Calendar */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Payment Calendar</CardTitle>
                <CardDescription>
                  View payment due dates at a glance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Make a Payment
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Set Up Auto Pay
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Payment Reminders
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}