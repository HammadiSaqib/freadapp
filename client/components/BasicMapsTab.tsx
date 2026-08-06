import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, CheckCircle, Award, BookOpen, Plus, Rocket, Clock, BarChart3, Play } from "lucide-react";

export default function BasicMapsTab({ learningPaths, courseMaps, setIsCreatePathOpen }: { learningPaths: any[], courseMaps: any[], setIsCreatePathOpen: (open: boolean) => void }) {
    return (
        
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
    
    );
}
