import { Check, ClipboardCopy } from "lucide-react";
import toast from "react-hot-toast";
import type { SubjectQuizItemDto } from "@/services/quiz";
import { useState } from "react";

interface SubtopicInfo {
  name: string;
  topicName: string;
}

interface CardProps {
  quiz: SubjectQuizItemDto;
  subtopic?: SubtopicInfo;
  onViewDetails: (quizCode: string, quiz: SubjectQuizItemDto) => void;
}

const Card = ({ quiz, subtopic, onViewDetails }: CardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(quiz.quizCode);
      setCopied(true);
      toast.success("Quiz code copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  return (
    <div className="border-t-[3px] border-r-[3px] border-b border-l border-[#292382] rounded-md overflow-hidden">
      <div className="px-[18px] space-y-1 pt-[17px]">
        <div className="flex items-center justify-between">
          <h3 className="text-[#0A5C43] font-bold text-[10px] rounded-[6px] bg-[#E6F7F2] py-1 px-2">
            {quiz.quizCode}
          </h3>
          <div className={`flex items-center gap-1.5 rounded-[20px] py-1 px-2.5 ${quiz.attemptStatus.completedAttempts > 0 ? "bg-[#E6F7F2]" : "bg-amber-50"
            }`}>
            <span className={`w-[5px] h-[5px] rounded-full p-[5px] ${quiz.attemptStatus.completedAttempts > 0 ? "bg-[#0A5C43]" : "bg-amber-500"
              }`} />
            <h3 className={`font-medium text-xs ${quiz.attemptStatus.completedAttempts > 0 ? "text-[#0A5C43]" : "text-amber-700"}`}>
              {quiz.attemptStatus.completedAttempts > 0 ? "Attempted" : "Pending"}
            </h3>
          </div>
        </div>

        <div className="py-[5px]">
          <h2 className="text-[#0F0F0E] font-semibold text-sm leading-5">
            {quiz.lessonTitle || "Untitled Quiz"}
          </h2>
        </div>
        {subtopic && (
          <p className="text-[#A0A09C] font-normal text-xs">
            {subtopic.topicName}{subtopic.topicName && subtopic.name !== "General" ? " · " : ""}{subtopic.name !== "General" ? subtopic.name : ""}
          </p>
        )}
        <div className="mt-1">
          <p className="text-[#A0A09C] font-normal text-xs">
            {quiz.totalQuestions} questions · {quiz.config.timeLimitMinutes ? `${quiz.config.timeLimitMinutes} min` : "No time limit"}
          </p>
        </div>

        <div className="pt-2 grid grid-cols-3 items-center gap-2">
          <div className="bg-[#F4F4F0] rounded-[8px] py-2 px-2.5">
            <h2 className="text-[#0F0F0E] font-bold text-[15px]">{quiz.totalQuestions}</h2>
            <p className="text-[#A0A09C] font-normal text-[10px]">Questions</p>
          </div>
          <div className="bg-[#F4F4F0] rounded-[8px] py-2 px-2.5">
            <h2 className="text-[#0F0F0E] font-bold text-[15px]">{quiz.attemptStatus.completedAttempts}</h2>
            <p className="text-[#A0A09C] font-normal text-[10px]">Attempts</p>
          </div>
          <div className="bg-[#F4F4F0] rounded-[8px] py-2 px-2.5">
            <h2 className="text-[#0F0F0E] font-bold text-[15px]">
              {quiz.bestScorePercent !== null ? `${quiz.bestScorePercent.toFixed(0)}%` : "—"}
            </h2>
            <p className="text-[#A0A09C] font-normal text-[10px]">Best Score</p>
          </div>
        </div>
      </div>

      <div className="bg-[#F4F4F0] border border-[#E8E8E3] flex justify-end items-center py-3 px-[18px] gap-2">
        <button
          onClick={() => onViewDetails(quiz.quizCode, quiz)}
          className="bg-white border border-[#E8E8E3] rounded-[7px] py-[4px] px-3"
        >
          <span className="text-[#5A5A5A] font-medium text-xs">View Details</span>
        </button>
        <button
          onClick={handleCopyId}
          className={`rounded-[7px] py-[4px] px-3 transition-all duration-200 ${copied
              ? "bg-green-600"
              : "bg-chestnut hover:bg-chestnut/90 active:scale-95"
            }`}
        >
          <span className="text-white font-medium text-xs flex items-center gap-1">
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied!
              </>
            ) : (
              <>
                <ClipboardCopy className="h-3 w-3" />
                Copy ID
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
};

export default Card;
