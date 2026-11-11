// Mapa del "Libro de lectura" de la pestaña Estudio: unidades → temas.
// Cada tema reúne sus resúmenes propios (content/summaries/<id>.md), las preguntas de sus
// categorías del banco y los ensayos de content/trials.json que le corresponden.
// Las categorías transversales (siglas, números, epónimos, ensayos...) no tienen tema propio fijo:
// cada pregunta se envía al tema clínico cuyas palabras clave (`kw`) mejor coinciden y, si ninguna
// coincide, queda en el tema de respaldo indicado en ROUTED.

export const UNITS = [
  '1 · Bases: anatomía, fisiología y exploración',
  '2 · Métodos diagnósticos',
  '3 · Insuficiencia cardíaca',
  '4 · Cardiopatía isquémica',
  '5 · Arritmias, síncope y dispositivos',
  '6 · Valvulopatías y endocarditis',
  '7 · Miocardio, pericardio y genética',
  '8 · Circulación pulmonar, aorta y vascular',
  '9 · Prevención y factores de riesgo',
  '10 · Poblaciones y situaciones especiales',
  '11 · Medicina interna y corazón',
  '12 · Farmacología cardiovascular',
  '13 · Evidencia, historia y miscelánea',
  '14 · Trasplante cardíaco',
]

const u = (n) => UNITS[n - 1]

export const TOPICS = [
  // 1 · Bases
  { id: 'anatomia', unit: u(1), title: 'Anatomía cardíaca aplicada', summaries: ['0901-anatomia'], categories: ['ANATOMÍA CARDÍACA'], kw: ['anatomia', 'coronaria derecha', 'descendente anterior', 'circunfleja', 'seno coronario', 'crista terminalis', 'koch', 'todaro', 'fosa oval', 'banda moderadora', 'pericardio transverso'] },
  { id: 'embriologia', unit: u(1), title: 'Embriología y circulación fetal', summaries: ['0902-embriologia'], categories: ['EMBRIOLOGÍA Y CIRCULACIÓN FETAL'], kw: ['embriolog', 'circulacion fetal', 'arco aortico', 'arcos aorticos', 'ductus venoso', 'tubo cardiaco', 'cresta neural', 'conotruncal'] },
  { id: 'fisiologia', unit: u(1), title: 'Fisiología cardiovascular', summaries: ['0903-fisiologia'], categories: ['FISIOLOGÍA CARDIOVASCULAR'], kw: ['fisiolog', 'frank-starling', 'starling', 'laplace', 'poiseuille', 'barorrefle', 'bainbridge', 'marey', 'bezold', 'presion-volumen', 'precarga', 'poscarga', 'contractilidad', 'potencial de accion', 'acoplamiento excitacion'] },
  { id: 'exploracion', unit: u(1), title: 'Exploración física: ruidos, soplos, pulsos y signos', summaries: ['0904-exploracion'], categories: ['SOPLOS Y RUIDOS CARDÍACOS', 'PULSOS Y ONDAS', 'SIGNOS Y EPÓNIMOS'], kw: ['soplo', 'ruido', 'chasquido', 'pulso', 'signo de', 'semiolog', 'auscult', 'onda a ', 'onda v ', 'kussmaul', 'pulso venoso', 'presion venosa yugular', 'maniobra', 'valsalva', 'galope', 'roce', 'austin flint', 'graham steell', 'carey coombs', 'quincke', 'musset', 'duroziez', 'traube', 'corrigan', 'hill', 'muller', 'osler', 'janeway', 'roth'] },

  // 2 · Métodos diagnósticos
  { id: 'ecg', unit: u(2), title: 'Electrocardiografía', summaries: ['0905-ecg'], categories: ['ECG EN IMAGEN', 'ECG EN IMAGEN IV', 'ECG: ¿Y AHORA QUÉ?', 'ECG: ¿Y AHORA QUÉ? II', 'ARRITMIAS Y ECG'], kw: ['ecg', 'electrocardiogram', 'onda t', 'onda p', 'onda q', 'onda u', 'onda j', 'onda epsilon', 'osborn', 'qtc', 'intervalo qt', 'intervalo pr', 'segmento st', 'bloqueo de rama', 'hemibloqueo', 'sgarbossa', 'wellens', 'de winter', 'bajo voltaje', 'eje '] },
  { id: 'eco', unit: u(2), title: 'Ecocardiografía y Doppler', summaries: ['0906-eco'], categories: ['ECO 2D: ¿QUÉ VES?', 'ECO Y DOPPLER EN IMAGEN', 'ECO EN IMAGEN III'], kw: ['ecocardiogra', 'doppler', 'eco ', 'ete', 'ett', 'strain', 'tapse', 'pisa', 'e/e', 'speckle', 'modo m', 'contraste', 'eco de estres', 'ecografia'] },
  { id: 'radiografia', unit: u(2), title: 'Radiografía de tórax', summaries: ['0907-radiografia'], categories: ['RADIOGRAFÍA DE TÓRAX', 'RADIOGRAFÍA II'], kw: ['radiografia', 'rx de torax', 'silueta', 'lineas b de kerley', 'kerley', 'muesca costal', 'cefalizacion'] },
  { id: 'imagen-avanzada', unit: u(2), title: 'RM, TC y medicina nuclear', summaries: ['0908-imagen-avanzada'], categories: ['RM, TC Y NUCLEAR', 'IMAGEN AVANZADA II'], kw: ['resonancia', 'rm cardiaca', 'realce tardio', 'mapeo t1', 'mapeo t2', 'volumen extracelular', 'lge', 'tc coronaria', 'angio-tc', 'angiotc', 'calcio coronario', 'agatston', 'cac', 'ffr-ct', 'spect', 'pet', 'gammagrafia', 'pirofosfato', 'tecnecio', 'medicina nuclear', 'perfusion miocardica'] },
  { id: 'hemodinamica', unit: u(2), title: 'Hemodinámica y cateterismo', summaries: ['0909-hemodinamica'], categories: ['HEMODINÁMICA Y CATETERISMO', 'HEMODINÁMICA II'], kw: ['hemodinam', 'cateterismo', 'swan-ganz', 'presion capilar', 'pcp', 'gasto cardiaco', 'termodilucion', 'fick', 'gorlin', 'hakki', 'oximetria', 'salto oximetrico', 'qp/qs', 'resistencia vascular', 'presion de enclavamiento', 'curva de presion'] },
  { id: 'biomarcadores', unit: u(2), title: 'Biomarcadores', summaries: ['0910-biomarcadores'], categories: ['BIOMARCADORES'], kw: ['biomarcador', 'troponina', 'bnp', 'nt-probnp', 'peptido natriuretico', 'ck-mb', 'dimero d', 'galectina', 'st2', 'copeptina', 'pcr ultrasensible'] },
  { id: 'escalas', unit: u(2), title: 'Escalas y puntuaciones de riesgo', summaries: ['0911-escalas'], categories: ['ESCALAS Y PUNTUACIONES'], kw: ['escala', 'puntuacion', 'score', 'grace', 'timi', 'cha2ds2', 'has-bled', 'wells', 'pesi', 'ginebra', 'syntax', 'heart score', 'killip', 'forrester', 'maggic', 'score2', 'crusade', 'precise-dapt', 'euroscore', 'sts'] },

  // 3 · Insuficiencia cardíaca
  { id: 'ic-cronica', unit: u(3), title: 'IC: definición, diagnóstico y tratamiento de la FEVI reducida', summaries: ['0101-ic-definicion-diagnostico', '0102-ic-fisiopatologia', '0103-ic-tratamiento-hfref'], categories: ['IC CRÓNICA', 'INSUFICIENCIA CARDÍACA CRÓNICA II', 'IC CON FEVI REDUCIDA', 'CASOS CLÍNICOS: INSUFICIENCIA CARDÍACA'], kw: ['insuficiencia cardiaca', 'icfer', 'hfref', 'fevi reducida', 'sacubitril', 'arni', 'isglt2', 'dapagliflozina', 'empagliflozina', 'espironolactona', 'eplerenona', 'finerenona', 'vericiguat', 'ivabradina', 'hierro', 'carboximaltosa', 'derisomaltosa', 'paradigm', 'dapa-hf', 'emperor', 'rales', 'emphasis', 'merit-hf', 'cibis', 'copernicus', 'shift', 'consensus', 'solvd', 'v-heft', 'a-heft', 'galactic', 'victoria', 'affirm-ahf', 'ironman', 'stop-hf', 'nyha', 'guide-hf', 'monitor-hf', 'champion'] },
  { id: 'ic-preservada', unit: u(3), title: 'IC con FEVI preservada y levemente reducida', summaries: ['0104-ic-fevi-preservada'], categories: ['IC CON FEVI PRESERVADA'], kw: ['fevi preservada', 'icfep', 'hfpef', 'h2fpef', 'hfa-peff', 'fevi levemente', 'deliver', 'emperor-preserved', 'topcat', 'paragon', 'step-hfpef', 'summit', 'finearts'] },
  { id: 'ic-aguda', unit: u(3), title: 'IC aguda descompensada', summaries: ['0105-ic-descompensada'], categories: ['IC DESCOMPENSADA Y AVANZADA'], kw: ['ic aguda', 'descompensad', 'edema agudo de pulmon', 'diuretico', 'furosemida', 'congestion', 'strong-hf', 'advor', 'acetazolamida', 'clorotiazida', 'dose', 'inotropic', 'dobutamina', 'levosimendan', 'milrinona', 'ultrafiltracion'] },
  { id: 'shock', unit: u(3), title: 'Shock cardiogénico y soporte mecánico', summaries: ['0106-shock-cardiogenico'], categories: ['SHOCK CARDIOGÉNICO'], kw: ['shock', 'scai', 'impella', 'ecmo', 'balon de contrapulsacion', 'bcia', 'iabp', 'culprit-shock', 'danger-shock', 'econ-shock', 'ecls-shock', 'iabp-shock', 'noradrenalina', 'lactato', 'power cardiaco'] },
  { id: 'ic-avanzada', unit: u(3), title: 'IC avanzada, trasplante y asistencia ventricular', summaries: ['0107-ic-dispositivos', '0108-ic-avanzada-trasplante'], categories: ['TRASPLANTE Y ASISTENCIA VENTRICULAR', 'TRASPLANTE Y ASISTENCIA II'], kw: ['asistencia ventricular', 'davi', 'lvad', 'heartmate', 'intermacs', 'ic avanzada', 'momentum', 'terapia de destino', 'puente al trasplante'] },

  // 4 · Cardiopatía isquémica
  { id: 'sca', unit: u(4), title: 'Síndrome coronario agudo: diagnóstico y tratamiento', summaries: ['0201-sca-diagnostico', '0202-sca-tratamiento'], categories: ['SÍNDROMES CORONARIOS', 'SCA SIN ELEVACIÓN DEL ST', 'SÍNDROME CORONARIO AGUDO II', 'CASOS CLÍNICOS: SÍNDROME CORONARIO AGUDO'], kw: ['sindrome coronario agudo', 'sca', 'scasest', 'iamsest', 'iamcest', 'infarto', 'angina inestable', 'minoca', 'scad', 'diseccion coronaria espontanea', 'takotsubo', 'definicion universal', 'ticagrelor', 'prasugrel', 'clopidogrel', 'dapt', 'fibrinolisis', 'tenecteplasa', 'alteplasa', 'estreptoquinasa', 'gusto', 'isis', 'plato', 'triton', 'cure', 'oasis', 'complete', 'clear synergy', 'commit', 'timi', 'killip'] },
  { id: 'iam-complicaciones', unit: u(4), title: 'IAMCEST y complicaciones del infarto', summaries: ['0203-complicaciones-iam'], categories: ['IAMCEST Y COMPLICACIONES'], kw: ['rotura', 'comunicacion interventricular', 'musculo papilar', 'pseudoaneurisma', 'aneurisma ventricular', 'trombo ventricular', 'dressler', 'infarto de ventriculo derecho', 'complicacion mecanica', 'pared libre'] },
  { id: 'scc', unit: u(4), title: 'Síndrome coronario crónico', summaries: ['0204-sindrome-coronario-cronico'], categories: ['SÍNDROME CORONARIO CRÓNICO', 'SÍNDROME CORONARIO CRÓNICO II'], kw: ['coronario cronico', 'angina estable', 'angina', 'inoca', 'anoca', 'microvascular', 'vasoespasmo', 'prinzmetal', 'ranolazina', 'nitrato', 'trimetazidina', 'courage', 'ischemia', 'revived', 'orbita', 'fame', 'compass', 'colchicina', 'colcot', 'lodoco', 'cantos', 'cirt', 'probabilidad pretest', 'isquemia', 'revascularizacion'] },
  { id: 'icp', unit: u(4), title: 'Intervencionismo coronario', summaries: ['0912-intervencionismo'], categories: ['INTERVENCIONISMO CORONARIO', 'EN LA SALA DE HEMODINÁMICA: TÉCNICAS DE ICP'], kw: ['icp', 'angioplastia', 'stent', 'reestenosis', 'trombosis del stent', 'bifurcacion', 'oclusion cronica', 'ivus', 'oct', 'ffr', 'ifr', 'litotricia', 'aterectomia', 'rotablator', 'acceso radial', 'tronco comun', 'cabg', 'bypass', 'cirugia coronaria', 'syntax', 'excel', 'noble', 'freedom', 'dkcrush', 'provisional', 'balon farmacoactivo', 'no-reflow'] },

  // 5 · Arritmias
  { id: 'fa', unit: u(5), title: 'Fibrilación y flúter auricular', summaries: ['0301-fibrilacion-auricular'], categories: ['FIBRILACIÓN AURICULAR', 'FIBRILACIÓN AURICULAR II', 'ENSAYOS: FA Y ANTICOAGULACIÓN'], kw: ['fibrilacion auricular', 'fa ', 'flutter', 'fluter', 'orejuela', 'watchman', 'cha2ds2', 'cardioversion', 'aislamiento de venas pulmonares', 'east-afnet', 'castle-af', 'rocket', 're-ly', 'aristotle', 'engage', 'affirm', 'race', 'cabana', 'artesia', 'noah', 'auricular'] },
  { id: 'tsv', unit: u(5), title: 'Taquicardias supraventriculares y preexcitación', summaries: ['0302-taquicardias-supraventriculares'], categories: ['TAQUICARDIAS SUPRAVENTRICULARES'], kw: ['supraventricular', 'tsv', 'trnav', 'reentrada nodal', 'via accesoria', 'wolff', 'wpw', 'preexcitacion', 'adenosina', 'taquicardia auricular', 'ortodromica', 'antidromica', 'mahaim', 'coumel', 'pjrt'] },
  { id: 'arritmias-ventriculares', unit: u(5), title: 'Arritmias ventriculares y muerte súbita', summaries: ['0303-arritmias-ventriculares-ms'], categories: ['ARRITMIAS VENTRICULARES', 'ARRITMIAS VENTRICULARES II', 'MUERTE SÚBITA Y CANALOPATÍAS'], kw: ['taquicardia ventricular', 'tv ', 'fibrilacion ventricular', 'muerte subita', 'extrasistol', 'brugada', 'qt largo', 'qt corto', 'tvpc', 'catecolaminergic', 'repolarizacion precoz', 'torsade', 'canalopatia', 'tormenta electrica', 'vereckei', 'criterios de brugada', 'tracto de salida'] },
  { id: 'bradi-sincope', unit: u(5), title: 'Bradiarritmias y síncope', summaries: ['0304-bradiarritmias-sincope'], categories: ['BRADIARRITMIAS', 'SÍNCOPE', 'SÍNCOPE II'], kw: ['bradicardia', 'bloqueo av', 'mobitz', 'wenckebach', 'disfuncion sinusal', 'enfermedad del nodo', 'sincope', 'vasovagal', 'mesa basculante', 'tilt', 'hipotension ortostatica', 'pots', 'disautonom', 'seno carotideo', 'holter implantable', 'lenegre', 'lev'] },
  { id: 'dispositivos', unit: u(5), title: 'Marcapasos, DAI y resincronización', summaries: ['0913-dispositivos'], categories: ['DISPOSITIVOS', 'DISPOSITIVOS II'], kw: ['marcapasos', 'dai', 'desfibrilador', 'resincronizacion', 'trc', 'estimulacion', 'his', 'rama izquierda', 'leadless', 'micra', 'subcutaneo', 'electrodo', 'programacion', 'histeresis', 'sindrome de marcapasos', 'madit', 'scd-heft', 'danish', 'care-hf', 'companion', 'mustic'] },
  { id: 'electrofisiologia', unit: u(5), title: 'Estudio electrofisiológico y ablación', summaries: ['0914-electrofisiologia'], categories: ['EN EL LABORATORIO DE ELECTROFISIOLOGÍA'], kw: ['electrofisiolog', 'ablacion', 'mapeo', 'carto', 'campo pulsado', 'crioablacion', 'radiofrecuencia', 'intervalo hv', 'intervalo ah', 'encarrilamiento', 'entrainment', 'fistula auriculoesofagica'] },

  // 6 · Válvulas
  { id: 'aortica', unit: u(6), title: 'Valvulopatía aórtica y TAVI', summaries: ['0401-estenosis-aortica'], categories: ['ESTENOSIS AÓRTICA Y TAVI', 'VALVULOPATÍA AÓRTICA II', 'VÁLVULAS'], kw: ['estenosis aortica', 'insuficiencia aortica', 'tavi', 'tavr', 'aortica bicuspide', 'bicuspide', 'partner', 'corevalve', 'evolut', 'surtavi', 'notion', 'early tavr', 'avatar', 'recovery', 'bajo flujo', 'dobutamina a dosis bajas', 'heyde', 'protesis', 'valvulopat', 'valvula'] },
  { id: 'mitral', unit: u(6), title: 'Válvulas mitral y tricúspide', summaries: ['0402-mitral-tricuspide'], categories: ['MITRAL Y TRICÚSPIDE', 'MITRAL Y TRICÚSPIDE II'], kw: ['mitral', 'tricusp', 'mitraclip', 'teer', 'coapt', 'mitra-fr', 'triluminate', 'reumat', 'prolapso', 'barlow', 'valvuloplastia', 'wilkins', 'pulmonar valvular', 'carcinoide', 'ebstein'] },
  { id: 'endocarditis', unit: u(6), title: 'Endocarditis infecciosa', summaries: ['0403-endocarditis'], categories: ['ENDOCARDITIS INFECCIOSA', 'ENDOCARDITIS II', 'PERICARDIO, MIOCARDITIS Y ENDOCARDITIS'], kw: ['endocarditis', 'duke', 'vegetacion', 'hemocultivo', 'profilaxis antibiotica', 'staphylococcus', 'estreptococo', 'enterococo', 'hacek', 'bartonella', 'coxiella', 'absceso perivalvular', 'poet', 'libman', 'marantica'] },

  // 7 · Miocardio, pericardio y genética
  { id: 'mch', unit: u(7), title: 'Miocardiopatía hipertrófica', summaries: ['0501-miocardiopatia-hipertrofica'], categories: ['MIOCARDIOPATÍA HIPERTRÓFICA'], kw: ['hipertrofica', 'mch', 'mavacamten', 'aficamten', 'miosina', 'obstruccion del tracto de salida', 'sam', 'miectomia', 'ablacion septal', 'brockenbrough', 'explorer', 'sequoia', 'hcm risk'] },
  { id: 'mcd-miocarditis', unit: u(7), title: 'Miocardiopatía dilatada, arritmogénica y miocarditis', summaries: ['0502-mcd-arritmogenica-miocarditis'], categories: ['MIOCARDIOPATÍA DILATADA Y ARRITMOGÉNICA', 'MIOCARDITIS', 'MIOCARDIOPATÍAS'], kw: ['miocardiopatia dilatada', 'arritmogenica', 'displasia', 'miocarditis', 'celulas gigantes', 'eosinofil', 'periparto', 'no compactacion', 'titina', 'ttn', 'lamina', 'lmna', 'desmoplaquina', 'plakofilina', 'flb', 'taquimiocardiopatia', 'alcoholica', 'lake louise', 'miocardiopat'] },
  { id: 'amiloidosis', unit: u(7), title: 'Amiloidosis y miocardiopatías infiltrativas', summaries: ['0915-amiloidosis'], categories: ['AMILOIDOSIS E INFILTRATIVAS'], kw: ['amiloid', 'attr', 'transtiretina', 'tafamidis', 'acoramidis', 'vutrisiran', 'patisiran', 'cadenas ligeras', 'sarcoid', 'fabry', 'hemocromatosis', 'danon', 'pompe', 'infiltrativ', 'attribute', 'helios', 'apollo'] },
  { id: 'chagas', unit: u(7), title: 'Chagas y cardiología tropical', summaries: ['0916-chagas'], categories: ['CHAGAS Y CARDIOLOGÍA TROPICAL'], kw: ['chagas', 'trypanosoma', 'cruzi', 'benznidazol', 'nifurtimox', 'romana', 'benefit', 'endomiocardiofibrosis', 'reumatica', 'tropical', 'triatomino'] },
  { id: 'pericardio', unit: u(7), title: 'Enfermedades del pericardio', summaries: ['0503-pericardio'], categories: ['PERICARDIO', 'PERICARDIO II'], kw: ['pericard', 'taponamiento', 'constrict', 'pulso paradojico', 'beck', 'colchicina', 'rilonacept', 'anakinra', 'pericardiocentesis', 'derrame', 'interdependencia ventricular', 'restriccion'] },
  { id: 'genetica', unit: u(7), title: 'Genética cardiovascular', summaries: ['0917-genetica'], categories: ['GENÉTICA CARDIOVASCULAR', 'GENÉTICA CARDIOVASCULAR II'], kw: ['genetic', 'gen ', 'genes', 'mutacion', 'variante', 'herencia', 'autosomica', 'ligada al x', 'penetrancia', 'cascada', 'acmg', 'noonan', 'marfan', 'loeys', 'turner', 'williams', 'digeorge', 'holt-oram', 'scn5a', 'kcnq1', 'ryr2', 'mybpc3', 'myh7'] },

  // 8 · Circulación pulmonar, aorta y vascular
  { id: 'tep', unit: u(8), title: 'Tromboembolia pulmonar', summaries: ['0601-tromboembolia-pulmonar'], categories: ['TROMBOEMBOLIA PULMONAR', 'TROMBOEMBOLIA PULMONAR II'], kw: ['tromboembolia', 'tep', 'embolia pulmonar', 'trombosis venosa', 'tvp', 'pesi', 'wells', 'peith', 'trombolisis', 'hestia', 'years', 'pert', 'filtro de vena cava'] },
  { id: 'hp', unit: u(8), title: 'Hipertensión pulmonar y corazón-pulmón', summaries: ['0602-hipertension-pulmonar'], categories: ['HIPERTENSIÓN PULMONAR', 'HIPERTENSIÓN PULMONAR II', 'PULMÓN Y CORAZÓN'], kw: ['hipertension pulmonar', 'hap', 'hptec', 'cteph', 'sotatercept', 'bosentan', 'ambrisentan', 'macitentan', 'sildenafil', 'tadalafil', 'riociguat', 'selexipag', 'epoprostenol', 'treprostinil', 'eisenmenger', 'cor pulmonale', 'epoc', 'apnea', 'resistencia vascular pulmonar', 'stellar', 'griphon', 'ambition', 'vasorreactividad'] },
  { id: 'aorta', unit: u(8), title: 'Enfermedades de la aorta', summaries: ['0603-aorta'], categories: ['ENFERMEDADES DE LA AORTA', 'AORTA II', 'AORTA, VASOS Y CIRCULACIÓN PULMONAR'], kw: ['aorta', 'aortic', 'diseccion', 'stanford', 'debakey', 'hematoma intramural', 'ulcera penetrante', 'aneurisma', 'coartacion', 'takayasu', 'arteritis', 'tevar', 'evar', 'marfan', 'loeys-dietz', 'ehlers'] },
  { id: 'periferica', unit: u(8), title: 'Arteriopatía periférica, carótida y vasos', summaries: ['0918-periferica'], categories: ['ARTERIOPATÍA PERIFÉRICA Y CARÓTIDA'], kw: ['periferica', 'claudicacion', 'itb', 'indice tobillo', 'isquemia critica', 'isquemia aguda de miembro', 'carotid', 'renal', 'mesenteric', 'fibromuscular', 'leriche', 'raynaud', 'buerger', 'voyager', 'euclid'] },
  { id: 'ictus', unit: u(8), title: 'Ictus y neurocardiología', summaries: ['0919-ictus-neuro'], categories: ['ICTUS Y NEUROCARDIOLOGÍA', 'NEUROLOGÍA Y CORAZÓN'], kw: ['ictus', 'acv', 'accidente cerebrovascular', 'foramen oval', 'fop', 'cardioembol', 'esus', 'navigate', 'respect', 'close', 'hemorragia subaracnoidea', 'neurogenic', 'duchenne', 'steinert', 'distrofia', 'friedreich', 'neuromuscular', 'epilepsia', 'sudep'] },

  // 9 · Prevención
  { id: 'hta', unit: u(9), title: 'Hipertensión arterial', summaries: ['0701-hipertension'], categories: ['HIPERTENSIÓN ARTERIAL', 'HIPERTENSIÓN ARTERIAL II'], kw: ['hipertension arterial', 'hta', 'presion arterial', 'mapa', 'amcpa', 'denervacion renal', 'hiperaldosteronismo', 'feocromocitoma', 'resistente', 'sprint', 'accord-bp', 'step', 'hope-3', 'allhat', 'ascot', 'pathway', 'emergencia hipertensiva', 'urgencia hipertensiva', 'liddle', 'gordon'] },
  { id: 'lipidos', unit: u(9), title: 'Lípidos y dislipidemias', summaries: ['0702-lipidos'], categories: ['LÍPIDOS', 'LÍPIDOS II', 'PREVENCIÓN, HTA Y LÍPIDOS'], kw: ['ldl', 'colesterol', 'estatina', 'ezetimiba', 'pcsk9', 'evolocumab', 'alirocumab', 'inclisiran', 'bempedoico', 'lipoproteina(a)', 'lp(a)', 'triglicerid', 'icosapento', 'hipercolesterolemia familiar', 'dislipidemia', 'apob', '4s', 'woscops', 'jupiter', 'improve-it', 'fourier', 'odyssey', 'clear outcomes', 'reduce-it', 'xantoma'] },
  { id: 'diabetes', unit: u(9), title: 'Diabetes, obesidad y cardiometabolismo', summaries: ['0703-diabetes-obesidad-prevencion'], categories: ['DIABETES Y CORAZÓN', 'MEDICINA INTERNA CARDIOMETABÓLICA'], kw: ['diabetes', 'glucemia', 'hba1c', 'metformina', 'glp-1', 'semaglutida', 'tirzepatida', 'liraglutida', 'obesidad', 'select', 'leader', 'sustain', 'empa-reg', 'canvas', 'declare', 'credence', 'cardiometab', 'sindrome metabolico'] },
  { id: 'prevencion', unit: u(9), title: 'Prevención y estilo de vida', summaries: ['0935-prevencion-estilo-de-vida'], categories: ['PREVENCIÓN Y ESTILO DE VIDA', 'ENSAYOS: PREVENCIÓN Y FACTORES DE RIESGO'], kw: ['prevencion', 'tabaco', 'tabaquismo', 'vareniclina', 'dieta', 'mediterranea', 'predimed', 'ejercicio', 'actividad fisica', 'rehabilitacion cardiaca', 'alcohol', 'sal ', 'sodio', 'polipildora', 'secure', 'aspirina en prevencion primaria', 'arrive', 'aspree', 'ascend', 'hope', 'framingham', 'origin'] },

  // 10 · Poblaciones especiales
  { id: 'congenitas', unit: u(10), title: 'Cardiopatías congénitas del adulto', summaries: ['0801-cardiopatias-congenitas'], categories: ['CARDIOPATÍAS CONGÉNITAS', 'CARDIOPATÍAS CONGÉNITAS II'], kw: ['congenit', 'cia', 'civ', 'ductus', 'tetralogia', 'fallot', 'fontan', 'transposicion', 'switch', 'mustard', 'senning', 'jatene', 'ross', 'rastelli', 'glenn', 'blalock', 'amplatzer', 'seno venoso', 'canal av', 'ebstein', 'eisenmenger', 'coartacion'] },
  { id: 'embarazo', unit: u(10), title: 'Corazón y embarazo', summaries: ['0802-embarazo'], categories: ['CORAZÓN Y EMBARAZO', 'CARDIO-OBSTETRICIA II'], kw: ['embaraz', 'gestacion', 'gestante', 'periparto', 'preeclampsia', 'mwho', 'carpreg', 'zahara', 'lactancia', 'obstetric', 'puerperio'] },
  { id: 'oncologia', unit: u(10), title: 'Cardio-oncología', summaries: ['0803-cardio-oncologia'], categories: ['CARDIO-ONCOLOGÍA', 'CARDIO-ONCOLOGÍA II'], kw: ['oncolog', 'antraciclina', 'doxorrubicina', 'trastuzumab', 'her2', 'checkpoint', 'inhibidores de puntos de control', 'radioterapia', 'cardiotoxic', 'ibrutinib', 'fluorouracilo', '5-fu', 'dexrazoxano', 'cancer', 'quimioterapia', 'tirosina cinasa'] },
  { id: 'deporte', unit: u(10), title: 'Cardiología del deporte', summaries: ['0804-cardiologia-deporte'], categories: ['CORAZÓN DEL DEPORTISTA', 'CARDIOLOGÍA DEL DEPORTE II'], kw: ['deport', 'atleta', 'corazon de atleta', 'commotio', 'cribado precompeticion', 'criterios de seattle', 'zona gris'] },
  { id: 'geriatria', unit: u(10), title: 'Cardiología geriátrica', summaries: ['0920-geriatria'], categories: ['CARDIOLOGÍA GERIÁTRICA', 'CARDIOGERIATRÍA II'], kw: ['anciano', 'geriatr', 'fragilidad', 'polifarmacia', 'deprescrip', 'beers', 'stopp', 'octogenario', 'nonagenario', 'deterioro cognitivo', 'caidas'] },
  { id: 'criticos', unit: u(10), title: 'Parada cardíaca, RCP y cuidados críticos', summaries: ['0921-criticos-rcp'], categories: ['PARADA Y CUIDADOS CRÍTICOS', 'RCP Y CRÍTICOS II'], kw: ['parada', 'rcp', 'reanimacion', 'desfibrilacion', 'ritmo desfibrilable', 'adrenalina', 'posparada', 'control de temperatura', 'hipotermia', 'ttm', 'ecpr', 'pcr ', 'cuidados criticos', 'ventilacion mecanica', 'sepsis'] },
  { id: 'toxicologia', unit: u(10), title: 'Toxicología cardiovascular', summaries: ['0922-toxicologia'], categories: ['TOXICOLOGÍA CARDIOVASCULAR'], kw: ['toxic', 'intoxicacion', 'sobredosis', 'cocaina', 'digoxina', 'antidoto', 'glucagon', 'insulina en dosis altas', 'emulsion lipidica', 'tricliclic', 'triciclic', 'monoxido', 'cianuro', 'organofosforado', 'loperamida', 'anfetamina'] },

  // 11 · Medicina interna
  { id: 'rinon', unit: u(11), title: 'Riñón y corazón', summaries: ['0923-rinon'], categories: ['RIÑÓN Y CORAZÓN'], kw: ['renal', 'rinon', 'cardiorrenal', 'enfermedad renal cronica', 'erc', 'dialisis', 'hemodialisis', 'nefropatia por contraste', 'filtrado glomerular', 'tfge', 'albuminuria', 'cistatina', 'fistula arteriovenosa', 'fidelio', 'figaro'] },
  { id: 'endocrino', unit: u(11), title: 'Endocrinología y corazón', summaries: ['0924-endocrino'], categories: ['ENDOCRINO Y CORAZÓN', 'ENDOCRINO Y CORAZÓN II'], kw: ['tiroid', 'hipertiroid', 'hipotiroid', 'tirotoxic', 'amiodarona y tiroides', 'acromegalia', 'cushing', 'addison', 'feocromocitoma', 'paraganglioma', 'aldosteron', 'hiperparatiroid', 'testosterona', 'gh', 'carcinoide', 'endocrin'] },
  { id: 'infecciones', unit: u(11), title: 'Infecciones y corazón', summaries: ['0925-infecciones'], categories: ['INFECCIONES Y CORAZÓN', 'INFECCIONES Y CORAZÓN II'], kw: ['infeccion', 'vih', 'covid', 'sars-cov-2', 'lyme', 'borrelia', 'sifilis', 'tuberculos', 'difteria', 'influenza', 'vacuna', 'sepsis', 'fiebre reumatica', 'jones', 'virus', 'dengue', 'mpox'] },
  { id: 'hematologia', unit: u(11), title: 'Hematología, trombosis y corazón', summaries: ['0926-hematologia'], categories: ['SANGRE, TROMBOSIS Y CORAZÓN', 'HEMATOLOGÍA PARA EL CARDIÓLOGO'], kw: ['anemia', 'transfusion', 'trombocitopenia', 'heparina', 'tih', 'antifosfolipido', 'trombofilia', 'factor v leiden', 'drepanocit', 'talasemia', 'policitemia', 'chip', 'hematopoyesis clonal', 'hemofilia', 'von willebrand', 'coagulopatia', 'hematolog'] },
  { id: 'electrolitos', unit: u(11), title: 'Electrolitos y ácido-base', summaries: ['0927-electrolitos'], categories: ['ELECTROLITOS Y ÁCIDO-BASE'], kw: ['potasio', 'hiperpotasemia', 'hipopotasemia', 'hiponatremia', 'sodio serico', 'magnesio', 'calcio serico', 'hipercalcemia', 'hipocalcemia', 'acidosis', 'alcalosis', 'acido-base', 'electrolit', 'patiromer', 'ciclosilicato'] },
  { id: 'digestivo-reuma', unit: u(11), title: 'Aparato digestivo, reumatología y corazón', summaries: ['0928-digestivo-reuma'], categories: ['APARATO DIGESTIVO Y CORAZÓN', 'REUMATOLOGÍA Y CORAZÓN'], kw: ['hepat', 'cirrosis', 'portopulmonar', 'hepatopulmonar', 'hemorragia digestiva', 'inhibidor de la bomba', 'celiac', 'whipple', 'lupus', 'artritis reumatoide', 'esclerodermia', 'esclerosis sistemica', 'espondilitis', 'vasculitis', 'kawasaki', 'behcet', 'reumat', 'gota', 'colchicina'] },

  // 12 · Farmacología
  { id: 'farmacos', unit: u(12), title: 'Fármacos cardiovasculares y mecanismos de acción', summaries: ['0929-farmacos-mecanismos'], categories: ['FÁRMACOS CARDIOVASCULARES', '¿CÓMO FUNCIONA? MECANISMOS DE ACCIÓN'], kw: ['mecanismo', 'farmac', 'betabloque', 'ieca', 'ara ii', 'antagonista del calcio', 'diuretico', 'antiarritmic', 'vaughan williams', 'nitrato', 'inotrop', 'vasopresor'] },
  { id: 'dosis', unit: u(12), title: 'Dosis que hay que saber', summaries: ['0930-dosis'], categories: ['DOSIS QUE HAY QUE SABER', 'DOSIS QUE HAY QUE SABER II'], kw: ['dosis', 'dosis de carga', 'ajuste de dosis'] },
  { id: 'adversos', unit: u(12), title: 'Efectos adversos e interacciones', summaries: ['0931-adversos-interacciones'], categories: ['EFECTOS ADVERSOS QUE HAY QUE RECONOCER', 'INTERACCIONES FARMACOLÓGICAS'], kw: ['efecto adverso', 'efectos adversos', 'interaccion', 'cyp3a4', 'cyp2c9', 'cyp2c19', 'glicoproteina p', 'toxicidad', 'angioedema', 'rabdomiolisis', 'miopatia', 'tos'] },
  { id: 'antitromboticos', unit: u(12), title: 'Anticoagulación y antiagregación', summaries: ['0932-antitromboticos'], categories: ['ANTICOAGULACIÓN Y ANTIAGREGACIÓN'], kw: ['anticoagul', 'antiagreg', 'acod', 'apixaban', 'rivaroxaban', 'dabigatran', 'edoxaban', 'warfarina', 'acenocumarol', 'inr', 'idarucizumab', 'andexanet', 'aspirina', 'acido acetilsalicilico', 'puente', 'terapia triple', 'augustus', 'auguste', 'pioneer', 'heparina'] },

  // 13 · Evidencia y miscelánea
  { id: 'ensayos', unit: u(13), title: 'Ensayos clínicos que hay que conocer', summaries: [], categories: [], kw: [] },
  { id: 'lectura-critica', unit: u(13), title: 'Lectura crítica y estadística', summaries: ['0933-lectura-critica'], categories: ['LECTURA CRÍTICA DE ENSAYOS'], kw: ['estadistic', 'nnt', 'riesgo relativo', 'hazard ratio', 'no inferioridad', 'intencion de tratar', 'por protocolo', 'sensibilidad', 'especificidad', 'valor predictivo', 'sesgo', 'metaanalisis', 'win ratio', 'potencia', 'aleatorizacion', 'variable compuesta', 'curva roc'] },
  { id: 'historia', unit: u(13), title: 'Historia de la cardiología', summaries: ['0934-historia'], categories: ['HISTORIA DE LA CARDIOLOGÍA', 'HISTORIA DE LA CARDIOLOGÍA II'], kw: [] },
  { id: 'siglas-numeros', unit: u(13), title: 'Siglas, números y epónimos sueltos', summaries: [], categories: [], kw: [] },

  // 14 · Trasplante cardíaco
  { id: 'tx-candidato', unit: u(14), title: 'Evaluación del candidato y asignación', summaries: ['1401-tx-candidato'], categories: ['TRASPLANTE: EL CANDIDATO'], kw: ['candidato a trasplante', 'candidatos a trasplante', 'lista de trasplante', 'vo2 pico', 'cpra', 'sensibiliz', 'prueba cruzada', 'unos', 'estatus 1', 'puente a la candidatura', 'heart failure survival score'] },
  { id: 'tx-donante', unit: u(14), title: 'Donante, preservación, cirugía y posoperatorio', summaries: ['1402-tx-donante-cirugia'], categories: ['TRASPLANTE: DONANTE, CIRUGÍA Y POSOPERATORIO'], kw: ['donante', 'muerte encefalica', 'asistolia', 'organ care system', 'ocs', 'perfusion normotermica', 'isquemia del injerto', 'disfuncion primaria del injerto', 'tecnica bicava', 'biauricular', 'heterotopico', 'denervacion', 'rechazo hiperagudo', 'proceed', 'dcd', 'abo incompatible'] },
  { id: 'tx-inmuno', unit: u(14), title: 'Inmunosupresión', summaries: ['1403-tx-inmunosupresion'], categories: ['TRASPLANTE: INMUNOSUPRESIÓN'], kw: ['inmunosupres', 'tacrolimus', 'ciclosporina', 'micofenolato', 'azatioprina', 'everolimus', 'sirolimus', 'mtor', 'calcineurina', 'basiliximab', 'globulina antitimocitica', 'induccion', 'schedule', 'tictac'] },
  { id: 'tx-rechazo', unit: u(14), title: 'Rechazo: diagnóstico, vigilancia y tratamiento', summaries: ['1404-tx-rechazo'], categories: ['TRASPLANTE: RECHAZO Y VIGILANCIA'], kw: ['rechazo', 'biopsia endomiocardica', 'allomap', 'expresion genica', 'adn libre', 'c4d', 'pamr', 'anticuerpos donante', 'dsa', 'quilty', 'billingham', 'fotoferesis', 'd-oar', 'biopsias', 'vigilancia con'] },
  { id: 'tx-tardias', unit: u(14), title: 'Vasculopatía del injerto y complicaciones tardías', summaries: ['1405-tx-vasculopatia-tardias'], categories: ['TRASPLANTE: VASCULOPATÍA Y COMPLICACIONES TARDÍAS'], kw: ['vasculopatia del injerto', 'vasculopatia', 'cav', 'retrasplante', 'linfoproliferativo', 'postrasplante', 'kaposi', 'estatina', 'pravastatina', 'simvastatina', 'diltiazem', 'intima'] },
  { id: 'tx-infecciones', unit: u(14), title: 'Infecciones, vacunas y vida con el injerto', summaries: ['1406-tx-infecciones-vida'], categories: ['TRASPLANTE: INFECCIONES Y VIDA CON EL INJERTO'], kw: ['citomegalovirus', 'cmv', 'valganciclovir', 'pneumocystis', 'toxoplasma', 'nocardia', 'listeria', 'aspergillus', 'oportunista', 'entrenamiento interval', 'vida con el injerto'] },
  { id: 'tx-ensayos-historia', unit: u(14), title: 'Casos clínicos, ensayos e historia del trasplante', summaries: ['1407-tx-ensayos-historia'], categories: ['CASOS CLÍNICOS: TRASPLANTE CARDÍACO', 'TRASPLANTE: ENSAYOS, HISTORIA Y NÚMEROS'], kw: ['barnard', 'washkansky', 'shumway', 'xenotrasplante', 'kantrowitz'] },
]

// Categorías transversales: categoría → tema de respaldo si ninguna palabra clave coincide.
export const ROUTED = {
  'SIGLAS Y ACRÓNIMOS': 'siglas-numeros',
  'SIGLAS Y ACRÓNIMOS II': 'siglas-numeros',
  'SIGLAS Y ACRÓNIMOS III': 'siglas-numeros',
  'SIGLAS Y ACRÓNIMOS IV': 'siglas-numeros',
  'SIGLAS Y ACRÓNIMOS V': 'siglas-numeros',
  'NÚMEROS QUE IMPORTAN': 'siglas-numeros',
  'NÚMEROS QUE HAY QUE SABER II': 'siglas-numeros',
  'EPÓNIMOS II': 'siglas-numeros',
  'EPÓNIMOS III': 'siglas-numeros',
  'EPÓNIMOS IV': 'siglas-numeros',
  'ENSAYOS CLÍNICOS': 'ensayos',
  'ENSAYOS CLÁSICOS Y NEUTROS': 'ensayos',
  'ENSAYOS: LO QUE CAMBIÓ Y LO QUE NO': 'ensayos',
  'ENSAYOS: CARDIOPATÍA ISQUÉMICA': 'sca',
  'ENSAYOS: IC, VÁLVULAS Y DISPOSITIVOS': 'ic-cronica',
}

// Área de content/trials.json → tema de respaldo para los ensayos.
export const TRIAL_AREAS = {
  'Insuficiencia cardíaca': 'ic-cronica',
  'Síndrome coronario agudo': 'sca',
  'Arritmias y dispositivos': 'dispositivos',
  'FA y anticoagulación': 'fa',
  'Valvulopatías y estructural': 'aortica',
  'Enfermedad coronaria crónica': 'scc',
  'Lípidos y prevención': 'lipidos',
  Hipertensión: 'hta',
  'Diabetes, obesidad y riñón': 'diabetes',
  'Pericardio, TEP y otras': 'pericardio',
  Miocardiopatías: 'mcd-miocarditis',
  'Hipertensión pulmonar': 'hp',
  'Estimulación cardiaca y TRC': 'dispositivos',
  'Trasplante cardiaco': 'tx-ensayos-historia',
}
