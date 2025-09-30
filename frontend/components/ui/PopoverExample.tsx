'use client';

import React from 'react';
import { Popover } from './Popover';
import { Button } from './Button';
import { User, Settings, LogOut, Bell } from 'lucide-react';

export function PopoverExample() {
  return (
    <div className="p-8 space-y-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Popover Examples</h2>
      
      {/* Click Trigger Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Click Triggers</h3>
        
        <div className="flex flex-wrap gap-4">
          {/* User Menu */}
          <Popover
            content={
              <div className="p-2 w-48">
                <div className="px-3 py-2 text-sm font-medium text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700">
                  John Doe
                </div>
                <div className="py-1">
                  <button className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </button>
                  <button className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </button>
                  <button className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </button>
                </div>
              </div>
            }
            placement="bottom"
          >
            <Button variant="outline">
              <User className="h-4 w-4 mr-2" />
              User Menu
            </Button>
          </Popover>

          {/* Notifications */}
          <Popover
            content={
              <div className="p-4 w-80">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">3 new</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <p className="text-sm text-gray-900 dark:text-white">New message from John</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">2 minutes ago</p>
                  </div>
                  <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-md">
                    <p className="text-sm text-gray-900 dark:text-white">Task completed</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">1 hour ago</p>
                  </div>
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
                    <p className="text-sm text-gray-900 dark:text-white">System update available</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">3 hours ago</p>
                  </div>
                </div>
              </div>
            }
            placement="bottom"
          >
            <Button variant="outline" className="relative">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
              <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                3
              </span>
            </Button>
          </Popover>

          {/* Tooltip-style */}
          <Popover
            content={
              <div className="p-3">
                <p className="text-sm text-gray-900 dark:text-white">
                  This is a helpful tooltip with some information.
                </p>
              </div>
            }
            placement="top"
          >
            <Button variant="ghost">Hover for info</Button>
          </Popover>
        </div>
      </div>

      {/* Hover Trigger Examples */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Hover Triggers</h3>
        
        <div className="flex flex-wrap gap-4">
          <Popover
            trigger="hover"
            content={
              <div className="p-3">
                <p className="text-sm text-gray-900 dark:text-white">
                  Hover to see this popover content.
                </p>
              </div>
            }
            placement="right"
          >
            <Button variant="outline">Hover me</Button>
          </Popover>

          <Popover
            trigger="hover"
            content={
              <div className="p-4 w-64">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Feature Info</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  This feature allows you to manage your account settings and preferences.
                </p>
              </div>
            }
            placement="bottom"
          >
            <Button variant="ghost">Feature Details</Button>
          </Popover>
        </div>
      </div>

      {/* Different Placements */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">Different Placements</h3>
        
        <div className="flex flex-wrap gap-4">
          {['top', 'bottom', 'left', 'right'].map((placement) => (
            <Popover
              key={placement}
              content={
                <div className="p-3">
                  <p className="text-sm text-gray-900 dark:text-white">
                    Popover {placement}
                  </p>
                </div>
              }
              placement={placement as any}
            >
              <Button variant="outline" className="capitalize">
                {placement}
              </Button>
            </Popover>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PopoverExample;
