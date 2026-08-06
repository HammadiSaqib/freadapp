const fs = require('fs');
const path = require('path');

function createBasicComponent(name, props, jsxContent, imports) {
    let code = `import React from 'react';
${imports}

export default function ${name}({ ${props.map(p => p.split(':')[0]).join(', ')} }: { ${props.join(', ')} }) {
    return (
        ${jsxContent}
    );
}
`;
    // Strip Elite UI
    code = code.replace(/bg-gradient-to-[a-z]{1,2}\s+/g, '');
    code = code.replace(/from-[a-z]+-\d{2,3}\s+/g, '');
    code = code.replace(/via-[a-z]+-\d{2,3}\s+/g, '');
    code = code.replace(/to-[a-z]+-\d{2,3}\s*/g, '');
    code = code.replace(/shadow-(sm|md|lg|xl|2xl|inner|none)\s*/g, '');
    code = code.replace(/shadow\s+/g, '');
    code = code.replace(/rounded-3xl/g, 'rounded-sm');
    code = code.replace(/rounded-2xl/g, 'rounded-sm');
    code = code.replace(/rounded-xl/g, 'rounded-sm');
    code = code.replace(/rounded-lg/g, 'rounded-sm');
    code = code.replace(/rounded-full/g, 'rounded-sm');
    code = code.replace(/border-0/g, 'border border-slate-300');
    code = code.replace(/gradient-text-primary/g, 'text-slate-900');
    code = code.replace(/gradient-text-secondary/g, 'text-slate-800');
    code = code.replace(/text-transparent/g, 'text-slate-900');
    code = code.replace(/bg-clip-text/g, '');
    code = code.replace(/dark:bg-slate-800\/90/g, '');
    code = code.replace(/dark:from-[a-z0-9-]+/g, '');
    code = code.replace(/dark:to-[a-z0-9-]+/g, '');
    code = code.replace(/bg-white\/90/g, 'bg-white');
    code = code.replace(/backdrop-blur-sm/g, '');
    code = code.replace(/elite-nested-wrapper/g, '');

    fs.writeFileSync(path.join(__dirname, 'client/components', `${name}.tsx`), code);
}

// 1. BasicCommunityTab
createBasicComponent(
    'BasicCommunityTab',
    ['currentUser: any', 'userLoading: boolean'],
    `<div className="space-y-6">
      {userLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-sm h-8 w-8 border-b-2 border-slate-800 mx-auto mb-4"></div>
            <p className="text-slate-600">Loading community feed...</p>
          </div>
        </div>
      ) : currentUser ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <BasicCommunityFeed currentUser={{ ...currentUser, role: currentUser.role || 'user' }} />
          </div>
          <div className="lg:col-span-1">
            {/* Groups can remain as is if it's basic enough, or we strip it. Let's just use Groups for now. */}
            <Groups currentUser={{ ...currentUser, role: currentUser.role || 'user' }} />
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-slate-600">Unable to load community feed. Please try refreshing the page.</p>
          </div>
        </div>
      )}
    </div>`,
    `import BasicCommunityFeed from "./BasicCommunityFeed";\nimport { Groups } from "./community/Groups";`
);

// 2. BasicMapsTab
createBasicComponent(
    'BasicMapsTab',
    ['learningPaths: any[]', 'courseMaps: any[]', 'setIsCreatePathOpen: (open: boolean) => void'],
    `
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="bg-white border border-slate-300">
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-slate-600" />
            <div className="text-2xl font-bold text-slate-900">
              {learningPaths.length}
            </div>
            <div className="text-xs text-slate-600">Learning Paths</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-300">
          <CardContent className="p-4 text-center">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-slate-600" />
            <div className="text-2xl font-bold text-slate-900">
              {learningPaths.filter(p => p.isEnrolled).length}
            </div>
            <div className="text-xs text-slate-600">Active Paths</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-300">
          <CardContent className="p-4 text-center">
            <Award className="h-8 w-8 mx-auto mb-2 text-slate-600" />
            <div className="text-2xl font-bold text-slate-900">
              {learningPaths.filter(p => p.progress === 100).length}
            </div>
            <div className="text-xs text-slate-600">Completed Paths</div>
          </CardContent>
        </Card>
        <Card className="bg-white border border-slate-300">
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 mx-auto mb-2 text-slate-600" />
            <div className="text-2xl font-bold text-slate-900">
              {learningPaths.reduce((sum, path) => sum + path.totalCourses, 0)}
            </div>
            <div className="text-xs text-slate-600">Total Courses</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border border-slate-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-slate-900 pb-3">
                Learning Pathways
              </CardTitle>
              <CardDescription>
                Structured learning journeys to master funding
              </CardDescription>
            </div>
            <Button className="bg-slate-900 text-white" onClick={() => setIsCreatePathOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Custom Path
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {learningPaths.map((path) => {
              const getPathTypeIcon = (type: string) => {
                switch (type) {
                  case "fundamental": return <BookOpen className="h-4 w-4" />;
                  case "advanced": return <Rocket className="h-4 w-4" />;
                  case "specialized": return <Target className="h-4 w-4" />;
                  case "certification": return <Award className="h-4 w-4" />;
                  default: return <BookOpen className="h-4 w-4" />;
                }
              };

              return (
                <Card key={path.id} className="border border-slate-300 bg-white">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 bg-slate-100 rounded-sm flex items-center justify-center">
                            {getPathTypeIcon(path.type)}
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm">{path.name}</h3>
                            <Badge variant="outline">{path.type}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-slate-900">
                            {path.progress}%
                          </div>
                          <div className="text-xs text-slate-500">
                            {path.completedCourses}/{path.totalCourses} courses
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">{path.description}</p>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span>Progress</span>
                          <span>{path.progress}%</span>
                        </div>
                        <Progress value={path.progress} className="h-2 bg-slate-200" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
    `,
    `import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle, Award, BookOpen, Plus, Rocket, Clock, BarChart3, Play } from "lucide-react";`
);

// 3. BasicAboutTab
createBasicComponent(
    'BasicAboutTab',
    ['academyStats: any'],
    `
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
    `,
    `import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { BookOpen, Users, Award, MapPin, TrendingUp, CheckCircle } from "lucide-react";`
);

// 4. BasicDirectoryTab
createBasicComponent(
    'BasicDirectoryTab',
    ['businessDirectories: any[]', 'businessDirectoriesLoading: boolean', 'businessDirectoriesError: string | null'],
    `
    <Card className="bg-white border border-slate-300">
      <CardHeader>
        <CardTitle className="text-slate-900 flex items-center gap-2">
          <Building className="h-5 w-5" /> Business Directory
        </CardTitle>
        <CardDescription>Discover business listings.</CardDescription>
      </CardHeader>
      <CardContent>
        {businessDirectoriesLoading ? (
          <div className="py-16 text-center">Loading...</div>
        ) : businessDirectoriesError ? (
          <div className="p-4 text-red-800 bg-red-50 border border-red-200">{businessDirectoriesError}</div>
        ) : businessDirectories.length === 0 ? (
          <div className="py-16 text-center">No businesses listed yet.</div>
        ) : (
          <div className="overflow-x-auto border border-slate-200 rounded-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50">
                  <TableHead>Business Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {businessDirectories.map((directory) => (
                  <TableRow key={directory.id}>
                    <TableCell className="font-semibold">{directory.business_name}</TableCell>
                    <TableCell>{directory.business_email}</TableCell>
                    <TableCell>{directory.business_phone_number}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
    `,
    `import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Building, Mail, Phone, MapPin } from "lucide-react";`
);

console.log('Created Basic component tabs');
