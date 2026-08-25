import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'

export const NS = 'temporaryWorkspace'

export const en = {
  title: 'Temporary Workspace',
  description: 'Choose the parent directory used to create one isolated Workspace per temporary task.',
  loading: 'Loading settings…',
  retry: 'Retry',
  root: 'Temporary Workspace parent directory',
  rootHint: 'Each new temporary Workspace receives a unique child directory here. Default:',
  choose: 'Choose directory',
  picking: 'Choosing…',
  default: 'Use default',
  discard: 'Discard changes',
  save: 'Save',
  saving: 'Saving…',
} as const

export type TemporaryWorkspaceLocaleKey = keyof typeof en
type Dict = Record<TemporaryWorkspaceLocaleKey, string>

export const dictionaries = {
  en,
  zh: {
    title: '临时工作区', description: '选择父目录；每个临时任务都会在其中创建独立工作区。', loading: '正在读取设置…', retry: '重试',
    root: '临时工作区父目录', rootHint: '每个新临时工作区都会在这里获得唯一子目录。默认位于 DSH Home：', choose: '选择目录', picking: '选择中…',
    default: '使用默认地址', discard: '放弃更改', save: '保存', saving: '保存中…',
  },
  'zh-TW': {
    title: '臨時工作區', description: '選擇父目錄；每個臨時任務都會在其中建立獨立工作區。', loading: '正在讀取設定…', retry: '重試',
    root: '臨時 Workspace 父目錄', rootHint: '每個新臨時 Workspace 都會在此取得唯一子目錄。預設：', choose: '選擇目錄', picking: '選擇中…',
    default: '使用預設位置', discard: '捨棄變更', save: '儲存', saving: '儲存中…',
  },
  ja: {
    title: '一時ワークスペース', description: '一時タスクごとに独立した Workspace を作成する親ディレクトリを選択します。', loading: '設定を読み込み中…', retry: '再試行',
    root: '一時 Workspace の親ディレクトリ', rootHint: '新しい Workspace ごとに一意のサブディレクトリが作成されます。既定:', choose: 'ディレクトリを選択', picking: '選択中…',
    default: '既定を使用', discard: '変更を破棄', save: '保存', saving: '保存中…',
  },
  ko: {
    title: '임시 작업 공간', description: '각 임시 작업에 독립 Workspace를 만들 상위 디렉터리를 선택합니다.', loading: '설정을 불러오는 중…', retry: '다시 시도',
    root: '임시 Workspace 상위 디렉터리', rootHint: '새 Workspace마다 고유한 하위 디렉터리가 생성됩니다. 기본값:', choose: '디렉터리 선택', picking: '선택 중…',
    default: '기본값 사용', discard: '변경 취소', save: '저장', saving: '저장 중…',
  },
  es: {
    title: 'Workspace temporal', description: 'Elige el directorio principal donde se creará un Workspace aislado por tarea temporal.', loading: 'Cargando ajustes…', retry: 'Reintentar',
    root: 'Directorio principal de Workspaces temporales', rootHint: 'Cada Workspace nuevo recibe un subdirectorio único. Predeterminado:', choose: 'Elegir directorio', picking: 'Eligiendo…',
    default: 'Usar predeterminado', discard: 'Descartar cambios', save: 'Guardar', saving: 'Guardando…',
  },
  fr: {
    title: 'Espace de travail temporaire', description: 'Choisissez le dossier parent où créer un Workspace isolé par tâche temporaire.', loading: 'Chargement des réglages…', retry: 'Réessayer',
    root: 'Dossier parent des Workspaces temporaires', rootHint: 'Chaque nouveau Workspace reçoit un sous-dossier unique. Valeur par défaut :', choose: 'Choisir le dossier', picking: 'Sélection…',
    default: 'Utiliser la valeur par défaut', discard: 'Annuler les modifications', save: 'Enregistrer', saving: 'Enregistrement…',
  },
  de: {
    title: 'Temporärer Workspace', description: 'Wähle das übergeordnete Verzeichnis für einen isolierten Workspace pro temporärer Aufgabe.', loading: 'Einstellungen werden geladen…', retry: 'Erneut versuchen',
    root: 'Übergeordnetes Verzeichnis temporärer Workspaces', rootHint: 'Jeder neue Workspace erhält ein eindeutiges Unterverzeichnis. Standard:', choose: 'Verzeichnis wählen', picking: 'Auswahl…',
    default: 'Standard verwenden', discard: 'Änderungen verwerfen', save: 'Speichern', saving: 'Wird gespeichert…',
  },
  'pt-BR': {
    title: 'Workspace temporário', description: 'Escolha o diretório pai para criar um Workspace isolado por tarefa temporária.', loading: 'Carregando configurações…', retry: 'Tentar novamente',
    root: 'Diretório pai de Workspaces temporários', rootHint: 'Cada novo Workspace recebe um subdiretório exclusivo. Padrão:', choose: 'Escolher diretório', picking: 'Escolhendo…',
    default: 'Usar padrão', discard: 'Descartar alterações', save: 'Salvar', saving: 'Salvando…',
  },
  ru: {
    title: 'Временное рабочее пространство', description: 'Выберите родительский каталог для отдельного Workspace каждой временной задачи.', loading: 'Загрузка настроек…', retry: 'Повторить',
    root: 'Родительский каталог временных Workspace', rootHint: 'Каждый новый Workspace получает уникальный подкаталог. По умолчанию:', choose: 'Выбрать каталог', picking: 'Выбор…',
    default: 'Использовать значение по умолчанию', discard: 'Отменить изменения', save: 'Сохранить', saving: 'Сохранение…',
  },
  ar: {
    title: 'مساحة العمل المؤقتة', description: 'اختر المجلد الأصل لإنشاء مساحة عمل معزولة لكل مهمة مؤقتة.', loading: 'جارٍ تحميل الإعدادات…', retry: 'إعادة المحاولة',
    root: 'المجلد الأصل لمساحات العمل المؤقتة', rootHint: 'تحصل كل مساحة عمل جديدة على مجلد فرعي فريد. الافتراضي:', choose: 'اختيار المجلد', picking: 'جارٍ الاختيار…',
    default: 'استخدام الافتراضي', discard: 'تجاهل التغييرات', save: 'حفظ', saving: 'جارٍ الحفظ…',
  },
  hi: {
    title: 'अस्थायी कार्यस्थान', description: 'हर अस्थायी कार्य के लिए अलग Workspace बनाने वाली मूल डायरेक्टरी चुनें।', loading: 'सेटिंग लोड हो रही हैं…', retry: 'फिर प्रयास करें',
    root: 'अस्थायी Workspace की मूल डायरेक्टरी', rootHint: 'हर नए Workspace को एक अलग उपडायरेक्टरी मिलती है। डिफ़ॉल्ट:', choose: 'डायरेक्टरी चुनें', picking: 'चुना जा रहा है…',
    default: 'डिफ़ॉल्ट उपयोग करें', discard: 'बदलाव छोड़ें', save: 'सहेजें', saving: 'सहेजा जा रहा है…',
  },
} satisfies Record<string, Dict>

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    temporaryWorkspace: TemporaryWorkspaceLocaleKey
  }
}

export type TemporaryWorkspaceTranslate = TranslateNS<typeof NS>
