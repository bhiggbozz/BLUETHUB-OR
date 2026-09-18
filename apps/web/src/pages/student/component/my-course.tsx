import { useNavigate } from "react-router-dom"
import CourseList from "./course-list"



const MyCourse = () => {
  const navigate = useNavigate()
  return (
    <div className="overflow-hidden rounded-md border border-white/75 bg-white/82 backdrop-blur-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="font-poppins text-sm font-semibold text-slate-900 capitalize">My Courses</h2>
            <p className="mt-0.5 text-xs text-slate-500">Track your active subjects.</p>
          </div>
          <button type="button" onClick={() => navigate('my-course')} className="rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-semibold text-[#4F61E8] transition-colors hover:bg-[#e0e7ff]">View all</button>
        </div>
        <section className="px-4 py-3 md:px-4 md:py-3">
            <CourseList/>
        </section>
    </div>
  )
}

export default MyCourse