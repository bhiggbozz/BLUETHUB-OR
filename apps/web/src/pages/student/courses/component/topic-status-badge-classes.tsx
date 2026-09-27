type TopicStatus = "Completed" | "In Progress" | "Not Started";

function TopicStatusBadgeClasses(status: TopicStatus) {
  switch (status) {
    case "Completed":
      return "bg-emerald-100 text-emerald-700 hover:bg-emerald-100";
    case "In Progress":
      return "bg-blue-100 text-blue-700 hover:bg-blue-100";
    case "Not Started":
      return "bg-slate-100 text-slate-600 hover:bg-slate-100";
  }
}

export default TopicStatusBadgeClasses