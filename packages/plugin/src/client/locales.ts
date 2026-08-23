import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'

export const NS = 'temporarySession'

export const en = {
  title: 'Temporary Workspace',
  description: 'Choose the configurable Workspace that isolates scratch Sessions from project work.',
  loading: 'Loading settings…',
  retry: 'Retry',
  root: 'Temporary Workspace directory',
  rootHint: 'Every temporary Session is grouped under this one Workspace. Default:',
  choose: 'Choose directory',
  picking: 'Choosing…',
  default: 'Use default',
  discard: 'Discard changes',
  save: 'Save',
  saving: 'Saving…',
} as const

export type TemporarySessionLocaleKey = keyof typeof en
type Dict = Record<TemporarySessionLocaleKey, string>

export const dictionaries = {
  en,
  zh: {
    title: '临时工作区', description: '选择与项目工作隔离、统一收纳临时会话的可配置工作区。', loading: '正在读取设置…', retry: '重试',
    root: '临时工作区目录', rootHint: '所有临时会话都会归在这一个工作区标签下。默认位于 DSH Home：', choose: '选择目录', picking: '选择中…',
    default: '使用默认地址', discard: '放弃更改', save: '保存', saving: '保存中…',
  },
  'zh-TW': {
    title: '臨時工作區', description: '選擇與專案工作隔離並統一收納臨時工作階段的工作區。', loading: '正在讀取設定…', retry: '重試',
    root: '臨時 Workspace 目錄', rootHint: '所有臨時工作階段都會歸在這一個 Workspace 群組下。預設：', choose: '選擇目錄', picking: '選擇中…',
    default: '使用預設位置', discard: '捨棄變更', save: '儲存', saving: '儲存中…',
  },
  ja: {
    title: '一時ワークスペース', description: 'プロジェクト作業から分離して一時セッションをまとめる Workspace を選択します。', loading: '設定を読み込み中…', retry: '再試行',
    root: '一時 Workspace ディレクトリ', rootHint: 'すべての一時セッションがこの1つの Workspace にまとめられます。既定:', choose: 'ディレクトリを選択', picking: '選択中…',
    default: '既定を使用', discard: '変更を破棄', save: '保存', saving: '保存中…',
  },
  ko: {
    title: '임시 작업 공간', description: '프로젝트 작업과 분리하여 임시 세션을 모을 Workspace를 선택합니다.', loading: '설정을 불러오는 중…', retry: '다시 시도',
    root: '임시 Workspace 디렉터리', rootHint: '모든 임시 세션이 하나의 Workspace 그룹 아래에 표시됩니다. 기본값:', choose: '디렉터리 선택', picking: '선택 중…',
    default: '기본값 사용', discard: '변경 취소', save: '저장', saving: '저장 중…',
  },
  es: {
    title: 'Workspace temporal', description: 'Elige el Workspace que aísla y agrupa las sesiones temporales.', loading: 'Cargando ajustes…', retry: 'Reintentar',
    root: 'Directorio del Workspace temporal', rootHint: 'Todas las sesiones temporales se agrupan bajo este único Workspace. Predeterminado:', choose: 'Elegir directorio', picking: 'Eligiendo…',
    default: 'Usar predeterminado', discard: 'Descartar cambios', save: 'Guardar', saving: 'Guardando…',
  },
  fr: {
    title: 'Espace de travail temporaire', description: 'Choisissez le Workspace qui isole et regroupe les sessions temporaires.', loading: 'Chargement des réglages…', retry: 'Réessayer',
    root: 'Dossier du Workspace temporaire', rootHint: 'Toutes les sessions temporaires sont regroupées sous ce Workspace unique. Valeur par défaut :', choose: 'Choisir le dossier', picking: 'Sélection…',
    default: 'Utiliser la valeur par défaut', discard: 'Annuler les modifications', save: 'Enregistrer', saving: 'Enregistrement…',
  },
  de: {
    title: 'Temporärer Workspace', description: 'Wähle den Workspace, der temporäre Sitzungen isoliert und gruppiert.', loading: 'Einstellungen werden geladen…', retry: 'Erneut versuchen',
    root: 'Verzeichnis des temporären Workspace', rootHint: 'Alle temporären Sitzungen werden unter diesem einen Workspace gruppiert. Standard:', choose: 'Verzeichnis wählen', picking: 'Auswahl…',
    default: 'Standard verwenden', discard: 'Änderungen verwerfen', save: 'Speichern', saving: 'Wird gespeichert…',
  },
  'pt-BR': {
    title: 'Workspace temporário', description: 'Escolha o Workspace que isola e agrupa as sessões temporárias.', loading: 'Carregando configurações…', retry: 'Tentar novamente',
    root: 'Diretório do Workspace temporário', rootHint: 'Todas as sessões temporárias ficam agrupadas neste único Workspace. Padrão:', choose: 'Escolher diretório', picking: 'Escolhendo…',
    default: 'Usar padrão', discard: 'Descartar alterações', save: 'Salvar', saving: 'Salvando…',
  },
  ru: {
    title: 'Временное рабочее пространство', description: 'Выберите Workspace, который изолирует и группирует временные сеансы.', loading: 'Загрузка настроек…', retry: 'Повторить',
    root: 'Каталог временного Workspace', rootHint: 'Все временные сеансы сгруппированы в одном Workspace. По умолчанию:', choose: 'Выбрать каталог', picking: 'Выбор…',
    default: 'Использовать значение по умолчанию', discard: 'Отменить изменения', save: 'Сохранить', saving: 'Сохранение…',
  },
  ar: {
    title: 'مساحة العمل المؤقتة', description: 'اختر مساحة العمل التي تعزل الجلسات المؤقتة وتجمعها.', loading: 'جارٍ تحميل الإعدادات…', retry: 'إعادة المحاولة',
    root: 'مجلد مساحة العمل المؤقتة', rootHint: 'تُجمع كل الجلسات المؤقتة ضمن مساحة عمل واحدة. الافتراضي:', choose: 'اختيار المجلد', picking: 'جارٍ الاختيار…',
    default: 'استخدام الافتراضي', discard: 'تجاهل التغييرات', save: 'حفظ', saving: 'جارٍ الحفظ…',
  },
  hi: {
    title: 'अस्थायी कार्यस्थान', description: 'वह Workspace चुनें जो अस्थायी सत्रों को अलग रखकर एक साथ समूहित करता है।', loading: 'सेटिंग लोड हो रही हैं…', retry: 'फिर प्रयास करें',
    root: 'अस्थायी Workspace डायरेक्टरी', rootHint: 'सभी अस्थायी सत्र इसी एक Workspace के अंतर्गत समूहित होते हैं। डिफ़ॉल्ट:', choose: 'डायरेक्टरी चुनें', picking: 'चुना जा रहा है…',
    default: 'डिफ़ॉल्ट उपयोग करें', discard: 'बदलाव छोड़ें', save: 'सहेजें', saving: 'सहेजा जा रहा है…',
  },
} satisfies Record<string, Dict>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    temporarySession: TemporarySessionLocaleKey
  }
}

export type TemporarySessionTranslate = TranslateNS<typeof NS>
