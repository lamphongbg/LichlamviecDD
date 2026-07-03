import React from 'react';
import { DepartmentSchedule, Staff } from '../types';
import { Sparkles, RefreshCw, Layers, CheckCircle, BookOpen, AlertTriangle, FileText, ChevronRight } from 'lucide-react';

interface AIAdvisorProps {
  analysisReport: string | null;
  isLoading: boolean;
  onTriggerAnalysis: () => void;
  isOpen: boolean;
  onClose: () => void;
}

// Compact and incredibly reliable client-side Markdown to Styled HTML parser
function parseMarkdownToHtml(markdown: string | null): string {
  if (!markdown) return '';
  
  let html = markdown
    // Sanitize HTML slightly to prevent injection
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    
    // Bold translations
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Headers translation
    .replace(/^### (.*?)$/gm, '<h4 class="text-sm font-bold text-slate-800 mt-4 mb-2 flex items-center gap-1">$1</h4>')
    .replace(/^## (.*?)$/gm, '<h3 class="text-base font-black text-blue-900 border-b border-blue-100 pb-2.5 mt-5 mb-3">$1</h3>')
    .replace(/^# (.*?)$/gm, '<h2 class="text-lg font-black text-[#0d1b2a] border-b-2 border-gray-100 pb-3 mt-6 mb-4 font-sans uppercase">$1</h2>')
    
    // List points translations
    .replace(/^\s*-\s*(.*?)$/gm, '<li class="text-xs text-gray-700 leading-relaxed font-semibold mb-1.5 list-disc ml-5">$1</li>')
    .replace(/^\s*\*\s*(.*?)$/gm, '<li class="text-xs text-gray-700 leading-relaxed font-semibold mb-1.5 list-disc ml-5">$1</li>')
    .replace(/^\s*\d+\.\s*(.*?)$/gm, '<li class="text-xs text-gray-700 leading-relaxed font-semibold mb-1.5 list-decimal ml-5">$1</li>')
    
    // Line breaks
    .replace(/^\s*$/gm, '<div class="h-2"></div>');

  return html;
}

export default function AIAdvisor({
  analysisReport,
  isLoading,
  onTriggerAnalysis,
  isOpen,
  onClose
}: AIAdvisorProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-lg bg-white shadow-2xl border-l border-gray-200 flex flex-col animate-slide-in">
      
      {/* Header section of Sidebar Panel */}
      <div className="p-4 bg-[#0d1b2a] text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-amber-500 text-white p-1.5 rounded-md animate-pulse">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider">CỐ VẤN CHUYÊN GIA AI</h2>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide">Trí Tuệ Nhân Tạo Phân Tích Nhân Lực Y Tế</p>
          </div>
        </div>
        <button
          id="btn-close-ai-panel"
          onClick={onClose}
          className="text-gray-400 hover:text-white text-xs font-bold leading-none p-1.5 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
        >
          ✕ Đóng
        </button>
      </div>

      {/* Main Container */}
      <div className="flex-1 overflow-y-auto p-5 scrollbar-thin">
        
        {isLoading ? (
          /* Animated loading cards representing multi-layer parsing */
          <div className="flex flex-col items-stretch gap-6 py-10">
            <div className="flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-amber-200 border-t-amber-500 animate-spin" />
                <Sparkles className="absolute inset-0 m-auto text-amber-500 w-5 h-5 animate-ping" />
              </div>
              <h3 className="text-sm font-extrabold text-blue-900 mt-2">Đang khởi động phân tích...</h3>
              <p className="text-xs text-gray-400 text-center max-w-xs font-semibold leading-relaxed">
                Hệ thống AI đang đọc toàn bộ sơ cấu, đếm ngày công, chiết xuất tỷ lệ nghỉ bù và đối soát chuẩn biên chế y tế...
              </p>
            </div>

            {/* Stepped Loading Lines and Animations */}
            <div className="flex flex-col gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 animate-pulse">
                <Layers className="w-4 h-4 text-gray-400" />
                <span>Bước 1: Quét biên chế & cơ cấu chuyên khoa...</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 animate-pulse delay-100">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span>Bước 2: Tìm kiếm lỗ hổng ngày công & thiếu hụt nhân sự...</span>
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 animate-pulse delay-200">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>Bước 3: Khảo cứu, lập báo cáo Ban Giám Đốc...</span>
              </div>
            </div>
          </div>
        ) : analysisReport ? (
          /* Printed analysis output */
          <div className="space-y-4">
            
            {/* Meta badge block */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-lg p-3 text-xs font-semibold shadow-xs">
              <strong>✔ Báo cáo đã hoàn thành!</strong> Phân tích được tổng hợp dựa trên dữ liệu đăng ký lịch làm việc thực tế của tất cả các khoa.
            </div>

            {/* Render report body via custom parser */}
            <div 
              className="prose prose-sm leading-relaxed text-gray-800"
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(analysisReport) }}
            />

            {/* Support section */}
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs mt-6">
              <span className="font-bold text-blue-900 block mb-1">Mẹo xử lý nhanh cảnh báo:</span>
              <p className="text-blue-950 font-medium">
                Bạn có thể điều hướng về vai trò <strong>&quot;Trưởng khoa&quot;</strong> để bổ sung ký tự đi làm bù [X], hoán ca [S] cho nhân sự của mình để hóa giải rủi ro vận hành.
              </p>
            </div>

          </div>
        ) : (
          /* Empty screen initial guide */
          <div className="text-center py-12 flex flex-col items-center justify-center gap-4">
            <div className="bg-amber-50 text-amber-600 p-4 rounded-full border border-amber-100 shadow-xs">
              <Sparkles className="w-8 h-8 text-amber-500 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 uppercase">Đối Sát Nhân Lực Y Tế bằng AI</h3>
              <p className="text-xs text-gray-400 font-medium max-w-xs mt-1.5 leading-relaxed">
                Phân tích toàn bộ dữ liệu lịch làm việc để phát hiện lập tức các rủi ro thiếu hụt hộ sinh/điều dưỡng, vi phạm quỹ phép, hoặc đề xuất cứu trợ tăng cường điều phối chéo.
              </p>
            </div>
            
            <button
              id="ai-advise-action-btn"
              onClick={onTriggerAnalysis}
              className="mt-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-5 py-2.5 rounded-lg shadow-sm cursor-pointer transition-transform flex items-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              <span>Tiến hành phân tích bằng AI</span>
            </button>
          </div>
        )}

      </div>

      {/* Footer bottom pad */}
      <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between text-[10px] text-gray-400 font-semibold font-mono">
        <span>Powered by Gemini 3.5 Flash</span>
        <span>Version: aistudio-builder</span>
      </div>

    </div>
  );
}
