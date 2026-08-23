import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'

export const NS = 'temporarySession'

export const en = {
  title: 'Temporary Sessions',
  description: 'Choose the fixed Workspace shared by automatically created scratch Sessions.',
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
    title: '临时会话', description: '选择所有临时会话共用的固定 Workspace。', loading: '正在读取设置…', retry: '重试',
    root: '临时 Workspace 目录', rootHint: '所有临时会话都会归在这一个 Workspace 标签下。默认：', choose: '选择目录', picking: '选择中…',
    default: '使用默认地址', discard: '放弃更改', save: '保存', saving: '保存中…',
  },
  'zh-TW': {
    title: '臨時工作階段', description: '選擇所有臨時工作階段共用的固定 Workspace。', loading: '正在讀取設定…', retry: '重試',
    root: '臨時 Workspace 目錄', rootHint: '所有臨時工作階段都會歸在這一個 Workspace 群組下。預設：', choose: '選擇目錄', picking: '選擇中…',
    default: '使用預設位置', discard: '捨棄變更', save: '儲存', saving: '儲存中…',
  },
  ja: {
    title: '一時セッション', description: 'すべての一時セッションが共有する固定 Workspace を選択します。', loading: '設定を読み込み中…', retry: '再試行',
    root: '一時 Workspace ディレクトリ', rootHint: 'すべての一時セッションがこの1つの Workspace にまとめられます。既定:', choose: 'ディレクトリを選択', picking: '選択中…',
    default: '既定を使用', discard: '変更を破棄', save: '保存', saving: '保存中…',
  },
  ko: {
    title: '임시 세션', description: '모든 임시 세션이 공유할 고정 Workspace를 선택합니다.', loading: '설정을 불러오는 중…', retry: '다시 시도',
    root: '임시 Workspace 디렉터리', rootHint: '모든 임시 세션이 하나의 Workspace 그룹 아래에 표시됩니다. 기본값:', choose: '디렉터리 선택', picking: '선택 중…',
    default: '기본값 사용', discard: '변경 취소', save: '저장', saving: '저장 중…',
  },
  es: {
    title: 'Sesiones temporales', description: 'Elige el Workspace fijo compartido por todas las sesiones temporales.', loading: 'Cargando ajustes…', retry: 'Reintentar',
    root: 'Directorio del Workspace temporal', rootHint: 'Todas las sesiones temporales se agrupan bajo este único Workspace. Predeterminado:', choose: 'Elegir directorio', picking: 'Eligiendo…',
    default: 'Usar predeterminado', discard: 'Descartar cambios', save: 'Guardar', saving: 'Guardando…',
  },
  fr: {
    title: 'Sessions temporaires', description: 'Choisissez le Workspace fixe partagé par toutes les sessions temporaires.', loading: 'Chargement des réglages…', retry: 'Réessayer',
    root: 'Dossier du Workspace temporaire', rootHint: 'Toutes les sessions temporaires sont regroupées sous ce Workspace unique. Valeur par défaut :', choose: 'Choisir le dossier', picking: 'Sélection…',
    default: 'Utiliser la valeur par défaut', discard: 'Annuler les modifications', save: 'Enregistrer', saving: 'Enregistrement…',
  },
  de: {
    title: 'Temporäre Sitzungen', description: 'Wähle den festen Workspace, den alle temporären Sitzungen teilen.', loading: 'Einstellungen werden geladen…', retry: 'Erneut versuchen',
    root: 'Verzeichnis des temporären Workspace', rootHint: 'Alle temporären Sitzungen werden unter diesem einen Workspace gruppiert. Standard:', choose: 'Verzeichnis wählen', picking: 'Auswahl…',
    default: 'Standard verwenden', discard: 'Änderungen verwerfen', save: 'Speichern', saving: 'Wird gespeichert…',
  },
  'pt-BR': {
    title: 'Sessões temporárias', description: 'Escolha o Workspace fixo compartilhado por todas as sessões temporárias.', loading: 'Carregando configurações…', retry: 'Tentar novamente',
    root: 'Diretório do Workspace temporário', rootHint: 'Todas as sessões temporárias ficam agrupadas neste único Workspace. Padrão:', choose: 'Escolher diretório', picking: 'Escolhendo…',
    default: 'Usar padrão', discard: 'Descartar alterações', save: 'Salvar', saving: 'Salvando…',
  },
  ru: {
    title: 'Временные сеансы', description: 'Выберите постоянный Workspace, общий для всех временных сеансов.', loading: 'Загрузка настроек…', retry: 'Повторить',
    root: 'Каталог временного Workspace', rootHint: 'Все временные сеансы сгруппированы в одном Workspace. По умолчанию:', choose: 'Выбрать каталог', picking: 'Выбор…',
    default: 'Использовать значение по умолчанию', discard: 'Отменить изменения', save: 'Сохранить', saving: 'Сохранение…',
  },
  ar: {
    title: 'الجلسات المؤقتة', description: 'اختر مساحة العمل الثابتة المشتركة بين جميع الجلسات المؤقتة.', loading: 'جارٍ تحميل الإعدادات…', retry: 'إعادة المحاولة',
    root: 'مجلد مساحة العمل المؤقتة', rootHint: 'تُجمع كل الجلسات المؤقتة ضمن مساحة عمل واحدة. الافتراضي:', choose: 'اختيار المجلد', picking: 'جارٍ الاختيار…',
    default: 'استخدام الافتراضي', discard: 'تجاهل التغييرات', save: 'حفظ', saving: 'جارٍ الحفظ…',
  },
  hi: {
    title: 'अस्थायी सत्र', description: 'सभी अस्थायी सत्रों के लिए साझा स्थिर Workspace चुनें।', loading: 'सेटिंग लोड हो रही हैं…', retry: 'फिर प्रयास करें',
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
