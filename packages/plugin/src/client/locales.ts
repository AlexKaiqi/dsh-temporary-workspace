import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'

export const NS = 'temporarySession'

export const en = {
  title: 'Temporary Sessions',
  description: 'Choose the fixed parent directory used for automatically created scratch Sessions.',
  loading: 'Loading settings…',
  retry: 'Retry',
  root: 'Temporary Session directory',
  rootHint: 'Each new Session receives its own task-* child directory. Default:',
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
    title: '临时会话', description: '选择自动创建临时会话时使用的固定父目录。', loading: '正在读取设置…', retry: '重试',
    root: '临时会话目录', rootHint: '每个新会话会在此目录下获得独立的 task-* 子目录。默认：', choose: '选择目录', picking: '选择中…',
    default: '使用默认地址', discard: '放弃更改', save: '保存', saving: '保存中…',
  },
  'zh-TW': {
    title: '臨時工作階段', description: '選擇自動建立臨時工作階段時使用的固定父目錄。', loading: '正在讀取設定…', retry: '重試',
    root: '臨時工作階段目錄', rootHint: '每個新工作階段會在此目錄下取得獨立的 task-* 子目錄。預設：', choose: '選擇目錄', picking: '選擇中…',
    default: '使用預設位置', discard: '捨棄變更', save: '儲存', saving: '儲存中…',
  },
  ja: {
    title: '一時セッション', description: '自動作成される一時セッションの固定親ディレクトリを選択します。', loading: '設定を読み込み中…', retry: '再試行',
    root: '一時セッションのディレクトリ', rootHint: '新しいセッションごとに task-* 子ディレクトリが作成されます。既定:', choose: 'ディレクトリを選択', picking: '選択中…',
    default: '既定を使用', discard: '変更を破棄', save: '保存', saving: '保存中…',
  },
  ko: {
    title: '임시 세션', description: '자동으로 생성되는 임시 세션의 고정 상위 디렉터리를 선택합니다.', loading: '설정을 불러오는 중…', retry: '다시 시도',
    root: '임시 세션 디렉터리', rootHint: '새 세션마다 이 디렉터리 아래에 독립적인 task-* 하위 디렉터리가 생성됩니다. 기본값:', choose: '디렉터리 선택', picking: '선택 중…',
    default: '기본값 사용', discard: '변경 취소', save: '저장', saving: '저장 중…',
  },
  es: {
    title: 'Sesiones temporales', description: 'Elige el directorio principal fijo para las sesiones temporales creadas automáticamente.', loading: 'Cargando ajustes…', retry: 'Reintentar',
    root: 'Directorio de sesiones temporales', rootHint: 'Cada sesión nueva recibe su propio subdirectorio task-*. Predeterminado:', choose: 'Elegir directorio', picking: 'Eligiendo…',
    default: 'Usar predeterminado', discard: 'Descartar cambios', save: 'Guardar', saving: 'Guardando…',
  },
  fr: {
    title: 'Sessions temporaires', description: 'Choisissez le dossier parent fixe des sessions temporaires créées automatiquement.', loading: 'Chargement des réglages…', retry: 'Réessayer',
    root: 'Dossier des sessions temporaires', rootHint: 'Chaque nouvelle session reçoit son propre sous-dossier task-*. Valeur par défaut :', choose: 'Choisir le dossier', picking: 'Sélection…',
    default: 'Utiliser la valeur par défaut', discard: 'Annuler les modifications', save: 'Enregistrer', saving: 'Enregistrement…',
  },
  de: {
    title: 'Temporäre Sitzungen', description: 'Wähle das feste übergeordnete Verzeichnis für automatisch erstellte temporäre Sitzungen.', loading: 'Einstellungen werden geladen…', retry: 'Erneut versuchen',
    root: 'Verzeichnis für temporäre Sitzungen', rootHint: 'Jede neue Sitzung erhält ein eigenes task-*-Unterverzeichnis. Standard:', choose: 'Verzeichnis wählen', picking: 'Auswahl…',
    default: 'Standard verwenden', discard: 'Änderungen verwerfen', save: 'Speichern', saving: 'Wird gespeichert…',
  },
  'pt-BR': {
    title: 'Sessões temporárias', description: 'Escolha o diretório pai fixo usado pelas sessões temporárias criadas automaticamente.', loading: 'Carregando configurações…', retry: 'Tentar novamente',
    root: 'Diretório de sessões temporárias', rootHint: 'Cada nova sessão recebe seu próprio subdiretório task-*. Padrão:', choose: 'Escolher diretório', picking: 'Escolhendo…',
    default: 'Usar padrão', discard: 'Descartar alterações', save: 'Salvar', saving: 'Salvando…',
  },
  ru: {
    title: 'Временные сеансы', description: 'Выберите постоянный родительский каталог для автоматически создаваемых временных сеансов.', loading: 'Загрузка настроек…', retry: 'Повторить',
    root: 'Каталог временных сеансов', rootHint: 'Каждый новый сеанс получает отдельный подкаталог task-*. По умолчанию:', choose: 'Выбрать каталог', picking: 'Выбор…',
    default: 'Использовать значение по умолчанию', discard: 'Отменить изменения', save: 'Сохранить', saving: 'Сохранение…',
  },
  ar: {
    title: 'الجلسات المؤقتة', description: 'اختر المجلد الأب الثابت للجلسات المؤقتة التي يتم إنشاؤها تلقائيًا.', loading: 'جارٍ تحميل الإعدادات…', retry: 'إعادة المحاولة',
    root: 'مجلد الجلسات المؤقتة', rootHint: 'تحصل كل جلسة جديدة على مجلد task-* فرعي مستقل. الافتراضي:', choose: 'اختيار المجلد', picking: 'جارٍ الاختيار…',
    default: 'استخدام الافتراضي', discard: 'تجاهل التغييرات', save: 'حفظ', saving: 'جارٍ الحفظ…',
  },
  hi: {
    title: 'अस्थायी सत्र', description: 'अपने-आप बनाए गए अस्थायी सत्रों के लिए स्थिर मूल डायरेक्टरी चुनें।', loading: 'सेटिंग लोड हो रही हैं…', retry: 'फिर प्रयास करें',
    root: 'अस्थायी सत्र डायरेक्टरी', rootHint: 'हर नए सत्र को अलग task-* उप-डायरेक्टरी मिलती है। डिफ़ॉल्ट:', choose: 'डायरेक्टरी चुनें', picking: 'चुना जा रहा है…',
    default: 'डिफ़ॉल्ट उपयोग करें', discard: 'बदलाव छोड़ें', save: 'सहेजें', saving: 'सहेजा जा रहा है…',
  },
} satisfies Record<string, Dict>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    temporarySession: TemporarySessionLocaleKey
  }
}

export type TemporarySessionTranslate = TranslateNS<typeof NS>
