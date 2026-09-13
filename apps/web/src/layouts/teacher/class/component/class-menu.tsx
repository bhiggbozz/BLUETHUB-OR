import Media from "@/pages/teacher/note-board/class-menu/media";
// import Paint from "@/pages/teacher/note-board/class-menu/paint";
import Pen from "@/pages/teacher/note-board/class-menu/pen";
import Select from "@/pages/teacher/note-board/class-menu/select";
import Shapes from "@/pages/teacher/note-board/class-menu/shapes";
import { Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@bluethub/ui-kit";
import { ChevronLeft
  } from "lucide-react";
import { useState } from "react";

const ClassMenu = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const toggleNav = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="font-poppins">
      <div className="flex flex-col items-center">
        {/* Toggle Button */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={toggleNav}
                className={`
                  mb-1.5 p-1.5 rounded-full
                  bg-white hover:bg-gray-100
                  border border-gray-200
                  shadow-sm
                  transition-all duration-200
                  ${isCollapsed ? 'rotate-0' : 'rotate-180'}
                `}
              >
                <ChevronLeft className="w-3.5 h-3.5 text-gray-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" align="center">
              <p className="font-poppins text-xs">
                {isCollapsed ? "Show tools" : "Hide tools"}
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Tools Container */}
        <div
          className={`
            overflow-hidden transition-all duration-300 ease-in-out
            ${isCollapsed ? "w-0 opacity-0" : "w-14 opacity-100"}
          `}
        >
          <div className="
            flex flex-col
            bg-white
            rounded-xl
            shadow-md
            border border-gray-200
            overflow-hidden
          ">
            <Select />
            <Pen />
            <Media />
            <Shapes />
            {/* <Paint /> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassMenu;
