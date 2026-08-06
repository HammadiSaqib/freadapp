import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BookOpen, Users, Award, MapPin, TrendingUp, CheckCircle } from "lucide-react";

export default function BasicAboutTab({ academyStats }: { academyStats: any }) {
    return (
        
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <Card className="bg-white border border-slate-300">
          <CardHeader>
            <CardTitle className="text-slate-900">About Score Machine Academy</CardTitle>
            <CardDescription>Empowering professionals with knowledge</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Our Mission</h3>
              <p className="text-slate-600">To provide comprehensive education and support for funding professionals.</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-3">What We Offer</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start space-x-3">
                  <BookOpen className="h-5 w-5 text-slate-800 mt-1" />
                  <div>
                    <h4 className="font-medium">Expert-Led Courses</h4>
                    <p className="text-sm text-slate-500">Comprehensive training</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-6">
        <Card className="bg-white border border-slate-300">
          <CardHeader>
            <CardTitle className="text-lg">Academy Stats</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-sm">
              <span className="text-sm font-medium">Active Members</span>
              <span className="font-bold">{academyStats?.activeMembers?.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-sm">
              <span className="text-sm font-medium">Total Courses</span>
              <span className="font-bold">{academyStats?.totalCourses}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-sm">
              <span className="text-sm font-medium">Success Rate</span>
              <span className="font-bold">{academyStats?.successRate}%</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
    
    );
}
