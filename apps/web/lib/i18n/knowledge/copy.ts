import type { Locale } from '../types';
import type { KnowledgeCategory } from '@/lib/knowledge/types';

interface ReadingCopy {
  knowledge: string;
  about: string;
  model: string;
  mining: string;
  github: string;
  navigation: string;
  newTab: string;
  skip: string;
  contents: string;
  search: string;
  searchHint: string;
  clear: string;
  empty: string;
  results: (count: number) => string;
  title: string;
  introduction: string;
  backTop: string;
  sourceTitle: string;
  sourceText: string;
  sources: string;
  bookEdition: string;
  chapterSeven: string;
  analysisSource: string;
  copy: string;
  copied: string;
  copyFailed: string;
  categories: Record<KnowledgeCategory, string>;
  diagramLabels: {
    start: string;
    end: string;
    redo: string;
    skip: string;
    log: string;
    discover: string;
    compare: string;
    replay: string;
  };
  playground: string;
  playgroundHint: string;
  duration: string;
  probability: string;
  once: string;
  unlimited: string;
  result: string;
  workedFormula: string;
  onceExplanation: string;
  repeatedExplanation: string;
  minutes: string;
  playgroundLoading: string;
  aboutTitle: string;
  aboutIntro: string;
  aboutBody: string;
  developers: string;
  developerRole: string;
  profile: string;
  repoTitle: string;
  repoDescription: string;
  principleTitle: string;
  principles: { title: string; text: string }[];
  screenshotCaption: string;
  figureAlt: string;
}

const EN: ReadingCopy = {
  knowledge: 'Knowledge',
  about: 'About',
  model: 'Model',
  mining: 'Mining',
  github: 'GitHub',
  navigation: 'Project navigation',
  newTab: 'Opens in a new tab',
  skip: 'Skip to content',
  contents: 'Contents',
  search: 'Search knowledge',
  searchHint: 'Try: rework, cycle time, Alpha Miner…',
  clear: 'Clear search',
  empty: 'No matching topics. Try a shorter phrase or a formula symbol such as CT or Wq.',
  results: (count) => `${count} matching ${count === 1 ? 'topic' : 'topics'}`,
  title: 'Understand the flow.\nKnow the formula.',
  introduction:
    'A working handbook for BPMN, cycle-time analysis and process mining. Find the rule, see its assumptions, then try it on the canvas.',
  backTop: 'Back to top',
  sourceTitle: 'Read with the assumptions in view',
  sourceText:
    'These explanations follow the formulas and supported semantics in Flowculus. Worked examples use illustrative data. A discovered graph is evidence of observed behaviour; a confirmed reference model defines the expected process.',
  sources: 'Sources and scope',
  bookEdition: '2nd ed., Springer',
  chapterSeven: 'chapter 7',
  analysisSource: 'Flowculus calculation source',
  copy: 'Copy formula',
  copied: 'Copied',
  copyFailed: 'Copy failed. Select the formula and copy it manually.',
  categories: {
    basics: 'BPMN & time',
    analysis: 'Quantitative analysis',
    mining: 'Process mining',
    workflow: 'Using Flowculus',
  },
  diagramLabels: {
    start: 'Start',
    end: 'End',
    redo: 'Redo A',
    skip: 'Skip redo',
    log: 'Event log',
    discover: 'Discover',
    compare: 'BPMN reference',
    replay: 'Token replay',
  },
  playground: 'One redo or repeated rework?',
  playgroundHint:
    'An isolated teaching model, calculated by the same analysis engine as the canvas. Your current diagram stays separate.',
  duration: 'Time per attempt',
  probability: 'Rework probability',
  once: 'At most one redo',
  unlimited: 'Repeated rework',
  result: 'Expected cycle time',
  workedFormula: 'Calculation for these inputs',
  onceExplanation:
    'The first attempt always runs. Only the redo is optional, so its duration is weighted by the rework probability. Skipping the redo adds zero minutes: this is the (1 − r) × 0 term. After the redo the process continues, with no return arrow.',
  repeatedExplanation:
    'After each attempt, the same rework decision can occur again. The expected time includes every possible number of attempts, with the same probability and duration per attempt.',
  minutes: 'min',
  playgroundLoading: 'Loading the rework example…',
  aboutTitle: 'Draw the flow.\nMake the reasoning visible.',
  aboutIntro:
    'Flowculus brings process modelling, quantitative analysis and event-log exploration into one browser workspace.',
  aboutBody:
    'Built for learning, checking assumptions and understanding why a result changes. Organise responsibility with Pool/Lane, exchange BPMN XML and compare an uploaded log against an approved model. Supported calculations and Mining methods expose their assumptions and limits.',
  developers: 'The developers',
  developerRole: 'Project developer',
  profile: 'GitHub profile',
  repoTitle: 'Follow the project on GitHub.',
  repoDescription:
    'Explore the source, review the architecture or report a reproducible issue in the Flowculus repository.',
  principleTitle: 'Designed to be understood.',
  principles: [
    {
      title: 'The formula stays visible',
      text: 'Read the mathematical breakdown alongside CT, TCT, CTE, cost and resource analysis.',
    },
    {
      title: 'Assumptions are part of the result',
      text: 'Inferred semantics need review. Unsupported structures withhold a number instead of guessing.',
    },
    {
      title: 'Your work stays in the browser',
      text: 'Models and logs are processed locally. Workers run the heavier analysis while you keep working.',
    },
  ],
  screenshotCaption:
    'The Flowculus model workspace after importing an illustrative process file.',
  figureAlt:
    'An imported process in the Flowculus editor with explainable cycle-time results.',
};

const VI: ReadingCopy = {
  knowledge: 'Kiến thức',
  about: 'Dự án',
  model: 'Mô hình',
  mining: 'Khai phá',
  github: 'GitHub',
  navigation: 'Điều hướng dự án',
  newTab: 'Mở trong tab mới',
  skip: 'Đi tới nội dung',
  contents: 'Mục lục',
  search: 'Tìm trong thư viện',
  searchHint: 'Thử: làm lại, thời gian chu trình, Alpha Miner…',
  clear: 'Xóa tìm kiếm',
  empty: 'Chưa tìm thấy chủ đề phù hợp. Thử cụm ngắn hơn hoặc ký hiệu như CT, Wq.',
  results: (count) => `${count} chủ đề phù hợp`,
  title: 'Hiểu từng luồng.\nNắm rõ từng công thức.',
  introduction:
    'Sổ tay BPMN, phân tích thời gian chu trình và khai phá quy trình. Tìm công thức, hiểu điều kiện áp dụng, rồi thử ngay trên canvas.',
  backTop: 'Về đầu trang',
  sourceTitle: 'Đọc công thức cùng điều kiện áp dụng',
  sourceText:
    'Nội dung bám theo công thức và ngữ nghĩa Flowculus đang hỗ trợ. Ví dụ dùng dữ liệu minh họa. Đồ thị khai phá mô tả hành vi đã quan sát; mô hình chuẩn đã xác nhận mới xác định quy trình mong đợi.',
  sources: 'Nguồn và phạm vi',
  bookEdition: 'ấn bản 2, Springer',
  chapterSeven: 'chương 7',
  analysisSource: 'Mã nguồn tính toán của Flowculus',
  copy: 'Sao chép công thức',
  copied: 'Đã sao chép',
  copyFailed: 'Chưa sao chép được. Hãy chọn công thức và sao chép thủ công.',
  categories: {
    basics: 'BPMN và thời gian',
    analysis: 'Phân tích định lượng',
    mining: 'Khai phá quy trình',
    workflow: 'Sử dụng Flowculus',
  },
  diagramLabels: {
    start: 'Bắt đầu',
    end: 'Kết thúc',
    redo: 'Làm lại A',
    skip: 'Bỏ qua làm lại',
    log: 'Event log',
    discover: 'Khám phá',
    compare: 'BPMN chuẩn',
    replay: 'Phát lại token',
  },
  playground: 'Làm lại một lần hay lặp nhiều lần?',
  playgroundHint:
    'Mô hình học tập độc lập, tính bằng cùng engine với canvas. Bản vẽ hiện tại của bạn không bị thay đổi.',
  duration: 'Thời gian mỗi lượt',
  probability: 'Xác suất làm lại',
  once: 'Tối đa một lần',
  unlimited: 'Lặp nhiều lần',
  result: 'Thời gian chu trình kỳ vọng',
  workedFormula: 'Cách tính với dữ liệu đang chọn',
  onceExplanation:
    'Lượt đầu luôn được thực hiện. Chỉ lượt làm lại là tùy chọn, nên thời gian của lượt đó được nhân với xác suất làm lại. Nhánh bỏ qua không tốn thêm thời gian: đó là số hạng (1 − r) × 0. Sau lượt làm lại, quy trình đi tiếp và không quay về hoạt động cũ.',
  repeatedExplanation:
    'Sau mỗi lượt, quy trình lại có thể quyết định làm lại với cùng xác suất. Thời gian kỳ vọng tính đến mọi số lượt có thể xảy ra, với cùng thời gian cho mỗi lượt.',
  minutes: 'phút',
  playgroundLoading: 'Đang tải ví dụ làm lại…',
  aboutTitle: 'Vẽ nên quy trình.\nHiểu rõ cách tính.',
  aboutIntro:
    'Flowculus kết nối mô hình hóa quy trình, phân tích định lượng và khám phá nhật ký sự kiện trong cùng một không gian trên trình duyệt.',
  aboutBody:
    'Dành cho việc học, kiểm tra giả định và hiểu vì sao kết quả thay đổi. Tổ chức trách nhiệm bằng Pool/Lane, trao đổi BPMN XML và đối chiếu log tải lên với mô hình chuẩn. Các phép tính và phương pháp Mining nêu rõ giả định cùng giới hạn.',
  developers: 'Hai nhà phát triển',
  developerRole: 'Nhà phát triển dự án',
  profile: 'Hồ sơ GitHub',
  repoTitle: 'Cùng theo dõi dự án trên GitHub.',
  repoDescription:
    'Xem mã nguồn, tìm hiểu kiến trúc hoặc báo lỗi kèm các bước tái hiện tại kho mã Flowculus.',
  principleTitle: 'Được xây để bạn hiểu rõ.',
  principles: [
    {
      title: 'Công thức luôn hiện diện',
      text: 'Xem diễn giải toán học cùng CT, TCT, CTE, chi phí và phân tích nguồn lực.',
    },
    {
      title: 'Giả định đi cùng kết quả',
      text: 'Ngữ nghĩa suy luận cần được rà soát. Cấu trúc chưa hỗ trợ sẽ không được gán một con số phỏng đoán.',
    },
    {
      title: 'Dữ liệu ở lại trình duyệt',
      text: 'Mô hình và nhật ký được xử lý cục bộ. Worker đảm nhận phần phân tích nặng để bạn tiếp tục thao tác.',
    },
  ],
  screenshotCaption: 'Không gian vẽ Flowculus sau khi nhập một file quy trình minh họa.',
  figureAlt:
    'Quy trình có gateway quyết định, hai tác vụ thay thế và phần diễn giải thời gian chu trình.',
};

export const getReadingCopy = (locale: Locale): ReadingCopy =>
  locale === 'vi' ? VI : EN;
