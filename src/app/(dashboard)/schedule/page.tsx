import { Header } from '@/components/layout/header'
import { ScheduleCalendar } from '@/components/schedule/schedule-calendar'
import { ScheduleForm } from '@/components/schedule/schedule-form'

export default function SchedulePage() {
  return (
    <>
      <Header 
        title="Schedule"
        subtitle="Plan and manage infrastructure check schedules"
        action={{ label: 'Schedule Check', href: '/checks/new' }}
      />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calendar view - takes 2 columns */}
          <div className="lg:col-span-2">
            <ScheduleCalendar />
          </div>

          {/* Quick schedule form */}
          <div>
            <ScheduleForm />
          </div>
        </div>
      </div>
    </>
  )
}



