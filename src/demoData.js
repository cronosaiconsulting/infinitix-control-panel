// Demo Data Generator for Infinitix Chatbot
// Generates realistic Spanish customer service conversations

// Customer personalities
const PERSONALITIES = {
  POLITE: 'polite',
  IMPATIENT: 'impatient',
  CONFUSED: 'confused',
  DIRECT: 'direct',
  FRIENDLY: 'friendly'
};

// Spanish typos and common mistakes
const applyTypos = (text, probability = 0.15) => {
  if (Math.random() > probability) return text;

  const typos = {
    'que': 'qe',
    'por favor': 'porfavor',
    'gracias': 'gracias',
    'hola': 'ola',
    'cuánto': 'cuanto',
    'está': 'esta',
    'más': 'mas',
    'también': 'tambien',
    'sí': 'si',
    'información': 'informacion'
  };

  let result = text;
  Object.entries(typos).forEach(([correct, typo]) => {
    if (Math.random() < 0.3) {
      result = result.replace(new RegExp(correct, 'gi'), typo);
    }
  });

  return result;
};

// Generate realistic timing for message
const generateMessageTime = (baseTime, messageIndex, isBot, personality) => {
  let delay;

  if (messageIndex === 0) {
    // First message: instant (0-2 seconds)
    delay = Math.floor(Math.random() * 2);
  } else if (isBot) {
    // Bot responses: 3-6 seconds
    delay = 3 + Math.floor(Math.random() * 3);
  } else {
    // User responses vary by personality
    const baseDelay = personality === PERSONALITIES.IMPATIENT ? 5 :
                     personality === PERSONALITIES.CONFUSED ? 15 :
                     personality === PERSONALITIES.DIRECT ? 8 :
                     personality === PERSONALITIES.FRIENDLY ? 12 : 10;

    const variance = Math.floor(Math.random() * 20);
    delay = baseDelay + variance;
  }

  return baseTime + delay;
};

// Conversation templates
const conversations = [
  {
    userId: "34612345001",
    userName: "María García",
    personality: PERSONALITIES.POLITE,
    topic: "seat_covers",
    messages: [
      { text: "Hola, buenos días. Estoy buscando fundas para los asientos de mi coche", sender: "user" },
      { text: "¡Hola María! Buenos días. Claro, estaré encantado de ayudarte. ¿Qué modelo de coche tienes?", sender: "bot" },
      { text: "Tengo un Seat León del 2020", sender: "user" },
      { text: "Perfecto, tenemos varias opciones de fundas para tu Seat León 2020:\n\n1. Fundas universales de tela - 49,99€\n2. Fundas a medida de cuero sintético - 129,99€\n3. Fundas premium de cuero genuino - 249,99€\n\nTodas están disponibles en stock. ¿Te gustaría ver más detalles de alguna?", sender: "bot" },
      { text: "Me interesan las de cuero sintético. ¿Qué colores tienen?", sender: "user" },
      { text: "Las fundas de cuero sintético para tu modelo están disponibles en:\n- Negro\n- Gris oscuro\n- Beige\n- Marrón\n\nTodas incluyen fundas para asientos delanteros y traseros. ¿Qué color prefieres?", sender: "bot" },
      { text: "El negro me parece bien. ¿Cuánto tarda el envío?", sender: "user" },
      { text: "¡Genial elección! El envío para tu zona suele tardar 2-3 días laborables. Si haces el pedido hoy antes de las 14:00, lo enviamos hoy mismo.\n\n¿Quieres que te ayude a hacer el pedido?", sender: "bot" },
      { text: "Sí, por favor. ¿Me puedes dar el enlace?", sender: "user" },
      { text: "Por supuesto. Te voy a enviar el enlace directo al producto:\n\noccsportplus.es/fundas-seat-leon-2020-negro\n\nSi tienes cualquier duda durante el proceso de compra, estoy aquí para ayudarte. ¿Necesitas algo más?", sender: "bot" },
      { text: "No, muchas gracias por tu ayuda", sender: "user" },
      { text: "¡De nada, María! Gracias a ti por tu compra. Que tengas un excelente día. 😊", sender: "bot" }
    ]
  },
  {
    userId: "34687654002",
    userName: "Carlos Rodríguez",
    personality: PERSONALITIES.IMPATIENT,
    topic: "delivery_status",
    messages: [
      { text: "Hola necesito saber donde esta mi pedido", sender: "user" },
      { text: "Hola Carlos, claro que sí. ¿Podrías proporcionarme tu número de pedido para consultarlo?", sender: "bot" },
      { text: "Es el OCC-2025-4721", sender: "user" },
      { text: "Gracias, un momento por favor mientras lo consulto...", sender: "bot" },
      { text: "Tu pedido OCC-2025-4721 está en camino. Según el transportista, está prevista la entrega para mañana entre las 9:00 y 14:00.\n\nNúmero de seguimiento: ES7829384756ES\nTransportista: SEUR", sender: "bot" },
      { text: "Ya pero es que lo pedi hace 5 dias", sender: "user" },
      { text: "Entiendo tu preocupación, Carlos. Déjame explicarte: el pedido salió de nuestro almacén hace 3 días, y el plazo normal de entrega es de 3-5 días laborables. Está dentro del plazo previsto.\n\nDe todas formas, veo que ya está en tu ciudad, por lo que debería llegar mañana sin falta. ¿Quieres que contacte con el transportista para confirmar?", sender: "bot" },
      { text: "Vale, pero que llegue mañana seguro", sender: "user" },
      { text: "Te aseguro que está programado para mañana. Si hubiera algún problema, te contactaré personalmente. ¿Hay algo más en lo que pueda ayudarte?", sender: "bot" },
      { text: "No", sender: "user" },
      { text: "Perfecto, Carlos. Cualquier cosa, aquí estoy. ¡Que tengas un buen día!", sender: "bot" }
    ]
  },
  {
    userId: "34656789003",
    userName: "Laura Martínez",
    personality: PERSONALITIES.CONFUSED,
    topic: "product_compatibility",
    messages: [
      { text: "Hola buenas, a ver si me puedes ayudar", sender: "user" },
      { text: "¡Hola Laura! Por supuesto, estoy aquí para ayudarte. ¿Qué necesitas?", sender: "bot" },
      { text: "Pues mira, es que vi unas alfombrillas pero no se si me valen", sender: "user" },
      { text: "Claro, puedo ayudarte con eso. ¿Recuerdas la referencia del producto o el modelo de tu coche?", sender: "bot" },
      { text: "Mi coche es un Peugeot... espera que lo miro... 208, del 2019 creo", sender: "user" },
      { text: "Perfecto, Peugeot 208 de 2019. ¿Recuerdas qué alfombrillas estabas mirando? ¿Eran las universales o las específicas?", sender: "bot" },
      { text: "No me acuerdo bien, las vi en vuestra web pero ahora no las encuentro", sender: "user" },
      { text: "No te preocupes, te ayudo a encontrarlas. Para tu Peugeot 208 2019, tenemos estas opciones:\n\n1. Alfombrillas universales de goma - 29,99€\n2. Alfombrillas específicas de moqueta - 45,99€\n3. Alfombrillas Premium con borde - 59,99€\n\nTodas son compatibles con tu modelo. ¿Te suenan algunas de estas?", sender: "bot" },
      { text: "Ah si! Creo que eran las de goma. Pero esas me valen seguro?", sender: "user" },
      { text: "Sí, Laura, las universales de goma te valen perfectamente para tu Peugeot 208. Son ajustables y se adaptan a la mayoría de modelos. Además, son muy fáciles de limpiar.\n\n¿Te gustaría que te enviara el enlace para verlas?", sender: "bot" },
      { text: "Si porfavor", sender: "user" },
      { text: "Aquí tienes: occsportplus.es/alfombrillas-goma-universal\n\nSi tienes cualquier duda sobre el pedido o la instalación, no dudes en preguntarme. ¿Necesitas algo más?", sender: "bot" },
      { text: "No, ya esta. Gracias!", sender: "user" },
      { text: "¡De nada, Laura! Cualquier cosa, aquí estoy. ¡Que tengas un buen día! 😊", sender: "bot" }
    ]
  },
  {
    userId: "34698765004",
    userName: "Javier Fernández",
    personality: PERSONALITIES.DIRECT,
    topic: "price_inquiry",
    messages: [
      { text: "Cuanto cuestan los portaesquís", sender: "user" },
      { text: "Hola Javier, buenas. Tenemos varios modelos de portaesquís:\n\n1. Básico (2 pares) - 89,99€\n2. Universal (4 pares) - 139,99€\n3. Premium magnético (4 pares) - 189,99€\n\n¿Para qué modelo de coche los necesitas?", sender: "bot" },
      { text: "Audi A4", sender: "user" },
      { text: "Perfecto, para un Audi A4 te recomiendo el Universal o el Premium. Ambos son compatibles con tu modelo. La diferencia principal es que el Premium tiene sistema magnético para apertura rápida.\n\n¿Tienes barras de techo instaladas?", sender: "bot" },
      { text: "Si, las originales de Audi", sender: "user" },
      { text: "Genial, entonces ambos modelos te sirven sin problema. El Universal a 139,99€ es muy popular y tiene excelentes valoraciones. ¿Cuántos pares de esquís necesitas transportar normalmente?", sender: "bot" },
      { text: "Con 4 suficiente. Dame el de 139", sender: "user" },
      { text: "Perfecto, el Universal de 4 pares. Está disponible en stock y el envío es gratuito.\n\n¿Quieres que te envíe el enlace directo para el pedido?", sender: "bot" },
      { text: "Si", sender: "user" },
      { text: "Aquí lo tienes: occsportplus.es/portaesquis-universal-4-pares\n\nIncluye instrucciones de montaje y todas las fijaciones necesarias. ¿Necesitas algo más?", sender: "bot" },
      { text: "No", sender: "user" },
      { text: "Perfecto, Javier. ¡Gracias por tu compra y buen viaje! ❄️", sender: "bot" }
    ]
  },
  {
    userId: "34612398005",
    userName: "Ana Sánchez",
    personality: PERSONALITIES.FRIENDLY,
    topic: "invoice_request",
    messages: [
      { text: "Hola Infinitix! Como estas? 😊", sender: "user" },
      { text: "¡Hola Ana! Muy bien, gracias por preguntar. ¿Y tú qué tal? ¿En qué puedo ayudarte hoy?", sender: "bot" },
      { text: "Muy bien tambien gracias! Mira, necesito la factura de mi ultimo pedido para la empresa", sender: "user" },
      { text: "Claro que sí, te ayudo enseguida con eso. ¿Recuerdas el número de pedido o la fecha aproximada?", sender: "bot" },
      { text: "Fue la semana pasada, compré unas fundas para las furgonetas de la empresa", sender: "user" },
      { text: "Perfecto, déjame buscarlo... Sí, aquí está:\n\nPedido: OCC-2025-4156\nFecha: 28 de octubre\nImporte: 389,97€\nProducto: Fundas furgoneta profesionales x3\n\n¿Es este, verdad?", sender: "bot" },
      { text: "Si! Ese mismo 👍", sender: "user" },
      { text: "Genial. Te voy a generar la factura ahora mismo. ¿Necesitas que aparezcan los datos fiscales de tu empresa o vale con los que tenemos en el sistema?", sender: "bot" },
      { text: "Los que teneis estan bien, son los correctos", sender: "user" },
      { text: "Perfecto, Ana. Ya está generada la factura. Te la he enviado por email a ana.sanchez@transportesrm.es\n\nNúmero de factura: 2025/1847\n\n¿Has recibido el email?", sender: "bot" },
      { text: "Sii, ya lo tengo! Muchas gracias, eres un sol ☀️", sender: "user" },
      { text: "¡De nada, Ana! Un placer ayudarte siempre. Si necesitas cualquier otra cosa, ya sabes dónde estoy. ¡Que tengas un día estupendo! 😊", sender: "bot" },
      { text: "Igualmente! Hasta pronto!", sender: "user" },
      { text: "¡Hasta pronto! 👋", sender: "bot" }
    ]
  },
  {
    userId: "34645123006",
    userName: "Miguel Torres",
    personality: PERSONALITIES.POLITE,
    topic: "stock_availability",
    messages: [
      { text: "Buenos días, quisiera consultar la disponibilidad de un producto", sender: "user" },
      { text: "Buenos días Miguel. Por supuesto, estaré encantado de ayudarte. ¿Qué producto te interesa?", sender: "bot" },
      { text: "Estoy buscando un organizador de maletero, específicamente el modelo plegable que vi en vuestra web", sender: "user" },
      { text: "Perfecto, el organizador de maletero plegable. Es uno de nuestros productos más populares. Tenemos dos versiones:\n\n1. Básico (2 compartimentos) - 24,99€\n2. Deluxe (3 compartimentos + aislamiento) - 39,99€\n\nAmbos están en stock. ¿Cuál te interesaba?", sender: "bot" },
      { text: "El Deluxe me parece mejor. ¿Tenéis stock suficiente para envío inmediato?", sender: "user" },
      { text: "Sí, Miguel. El modelo Deluxe tenemos 47 unidades en stock actualmente. Si haces el pedido ahora, podemos enviarlo hoy mismo y lo recibirías en 2-3 días laborables.\n\n¿En qué zona te encuentras?", sender: "bot" },
      { text: "Estoy en Madrid capital", sender: "user" },
      { text: "Perfecto, para Madrid capital el plazo es de 24-48 horas con nuestro servicio estándar. Si lo necesitas con más urgencia, también tenemos envío express (24h) por 5,99€ adicionales.\n\n¿Qué opción prefieres?", sender: "bot" },
      { text: "Con el estándar está bien, no hay prisa. ¿El precio incluye el envío?", sender: "user" },
      { text: "Sí, Miguel. El envío estándar es gratuito para pedidos superiores a 30€, así que en tu caso no tiene coste adicional. El total sería 39,99€.\n\n¿Te ayudo a completar el pedido?", sender: "bot" },
      { text: "Perfecto, sí por favor", sender: "user" },
      { text: "Genial. Te envío el enlace directo al producto:\n\noccsportplus.es/organizador-maletero-deluxe\n\nCuando finalices el pedido, recibirás un email de confirmación. ¿Necesitas ayuda con algo más?", sender: "bot" },
      { text: "No, eso es todo. Muchas gracias por la atención", sender: "user" },
      { text: "A ti, Miguel. Ha sido un placer ayudarte. ¡Que tengas un excelente día! 😊", sender: "bot" }
    ]
  },
  {
    userId: "34678945007",
    userName: "Carmen López",
    personality: PERSONALITIES.CONFUSED,
    topic: "return_policy",
    messages: [
      { text: "Hola, tengo una duda sobre una compra", sender: "user" },
      { text: "¡Hola Carmen! Claro, dime, ¿en qué puedo ayudarte?", sender: "bot" },
      { text: "Compré unas alfombrillas pero creo que me equivoqué de modelo", sender: "user" },
      { text: "Entiendo. No te preocupes, lo podemos solucionar. ¿Cuándo hiciste la compra y ya has recibido el producto?", sender: "bot" },
      { text: "Lo recibi ayer, las he probado y no me acaban de encajar bien", sender: "user" },
      { text: "Vale, tranquila. Según nuestra política de devoluciones, tienes 30 días desde la recepción para devolver el producto. Como solo ha pasado un día, no hay ningún problema.\n\n¿Quieres cambiarlas por el modelo correcto o prefieres devolverlas?", sender: "bot" },
      { text: "Es que no se cual es el modelo correcto para mi coche", sender: "user" },
      { text: "No te preocupes, te ayudo a encontrarlo. ¿Qué coche tienes?", sender: "bot" },
      { text: "Un Renault Clio, del 2021", sender: "user" },
      { text: "Perfecto, Renault Clio 2021. Para tu modelo, las alfombrillas correctas son las específicas ref. ALF-REN-CLIO-21.\n\n¿Qué alfombrillas habías pedido? ¿Recuerdas la referencia?", sender: "bot" },
      { text: "Pues no estoy segura... eran unas universales creo", sender: "user" },
      { text: "Vale, no pasa nada. ¿Me puedes decir tu número de pedido? Así lo miro en el sistema y veo exactamente cuáles compraste.", sender: "bot" },
      { text: "Si, espera... OCC-2025-4892", sender: "user" },
      { text: "Perfecto, gracias. Ya lo veo:\n\nCompraste: Alfombrillas universales básicas\nTe hacen falta: Alfombrillas específicas Renault Clio 2021\n\nLas específicas cuestan 45,99€ (compraste las universales por 29,99€).\n\n¿Quieres que haga el cambio? Solo tendrías que pagar la diferencia de 16€.", sender: "bot" },
      { text: "Vale, si, eso estaría bien. Y como las devuelvo?", sender: "user" },
      { text: "Es muy sencillo:\n\n1. Te voy a enviar una etiqueta de devolución por email\n2. Pones las alfombrillas en su caja original\n3. Pegas la etiqueta y lo llevas a cualquier punto de recogida\n4. Cuando las recibamos, te enviamos las correctas\n\nEl proceso completo suele tardar 5-7 días. ¿Te parece bien?", sender: "bot" },
      { text: "Si, perfecto. Gracias por tu paciencia 😅", sender: "user" },
      { text: "¡Para nada, Carmen! Para eso estoy. Ya te he enviado la etiqueta y las instrucciones al email. Si tienes cualquier duda, escríbeme. ¿Algo más que necesites?", sender: "bot" },
      { text: "No, ya está todo. Muchas gracias!", sender: "user" },
      { text: "¡De nada! ¡Que tengas un buen día! 😊", sender: "bot" }
    ]
  },
  {
    userId: "34623456008",
    userName: "Roberto Díaz",
    personality: PERSONALITIES.DIRECT,
    topic: "bulk_order",
    messages: [
      { text: "Necesito hacer un pedido grande", sender: "user" },
      { text: "Hola Roberto. Por supuesto, puedo ayudarte con eso. ¿Qué cantidad y qué productos necesitas?", sender: "bot" },
      { text: "50 ambientadores para coche, los de ventilación", sender: "user" },
      { text: "Perfecto. Tenemos ambientadores de ventilación en varios aromas:\n- Océano\n- Coche nuevo\n- Vainilla\n- Cítricos\n\nPrecio unitario: 3,99€\nPara pedidos de +20 unidades: 3,49€/ud\nPara pedidos de +50 unidades: 2,99€/ud\n\n¿Quieres todos del mismo aroma o surtidos?", sender: "bot" },
      { text: "Mitad océano, mitad coche nuevo", sender: "user" },
      { text: "Entendido:\n- 25 ambientadores aroma Océano\n- 25 ambientadores aroma Coche nuevo\n- Precio: 2,99€ x 50 = 149,50€\n- Envío gratuito\n\nTotal: 149,50€\n\n¿Es para empresa? Si es así, necesito los datos fiscales para la factura.", sender: "bot" },
      { text: "Si, es para mi taller. Los datos están en mi perfil", sender: "user" },
      { text: "Perfecto, Roberto. Veo que tengo los datos de Taller Díaz e Hijos SL. ¿Confirmo el pedido con estos datos?", sender: "bot" },
      { text: "Si, adelante", sender: "user" },
      { text: "Genial. Pedido confirmado:\n\nPedido: OCC-2025-4923\nImporte: 149,50€ + IVA\nEnvío estimado: 3-4 días laborables\n\nRecibirás el email de confirmación en unos minutos. ¿Algo más?", sender: "bot" },
      { text: "No, gracias", sender: "user" },
      { text: "Perfecto. Gracias por tu compra, Roberto. ¡Hasta la próxima!", sender: "bot" }
    ]
  },
  {
    userId: "34667890009",
    userName: "Isabel Ruiz",
    personality: PERSONALITIES.FRIENDLY,
    topic: "product_recommendation",
    messages: [
      { text: "Holaaaa! 😊", sender: "user" },
      { text: "¡Hola Isabel! ¿Qué tal? ¿En qué puedo ayudarte hoy? 😊", sender: "bot" },
      { text: "Pues mira, quiero hacerle un regalo a mi marido para el coche pero no se que comprarle", sender: "user" },
      { text: "¡Qué bonito detalle! Para recomendarte algo, ¿me cuentas un poco? ¿Qué tipo de coche tiene y qué le suele gustar?", sender: "bot" },
      { text: "Tiene un BMW Serie 3, le encanta cuidar el coche, lo tiene siempre impecable jaja", sender: "user" },
      { text: "Jajaja perfecto, entonces sé exactamente qué recomendarte. Para alguien que cuida su coche, estas opciones le encantarían:\n\n1. Kit de limpieza premium (ceras, microfibras, pulimentos) - 79,99€\n2. Organizador de maletero de cuero - 59,99€\n3. Funda de volante de cuero genuino BMW - 49,99€\n4. Set de ambientadores de lujo - 34,99€\n\n¿Cuál crees que le gustaría más?", sender: "bot" },
      { text: "Uff, el kit de limpieza le vendría genial, siempre está comprando cosas de esas! Y la funda de volante también le molaría... cuanto seria todo?", sender: "user" },
      { text: "¡Buena elección! Si compras los dos juntos:\n\nKit de limpieza premium: 79,99€\nFunda de volante BMW cuero: 49,99€\nSubtotal: 129,98€\nDescuento pack (10%): -13,00€\n\nTotal: 116,98€ (envío gratis) 🎁\n\n¿Te parece bien?", sender: "bot" },
      { text: "Perfecto! Y me lo podeis envolver para regalo?", sender: "user" },
      { text: "¡Claro que sí! Tenemos servicio de envoltorio regalo por 4,99€. Incluye:\n- Papel de regalo elegante\n- Lazo decorativo\n- Tarjeta personalizada\n\n¿Quieres añadir algún mensaje en la tarjeta?", sender: "bot" },
      { text: "Si! Que ponga: \"Para el mejor conductor y marido. Te quiero! ❤️\"", sender: "user" },
      { text: "¡Qué bonito, Isabel! ❤️ Lo apunto:\n\n\"Para el mejor conductor y marido. Te quiero! ❤️\"\n\nTotal final: 121,97€\n\n¿Te envío el enlace para finalizar el pedido?", sender: "bot" },
      { text: "Si porfa! Y cuando me llegaria?", sender: "user" },
      { text: "Te llega en 2-3 días laborables. Si haces el pedido antes de las 14:00 de hoy, sale esta tarde.\n\nAquí está el enlace: occsportplus.es/carrito/regalo-isabel-bmw\n\n¿Algo más que necesites?", sender: "bot" },
      { text: "No, ya está todo! Muchísimas gracias por tu ayuda! 🥰", sender: "user" },
      { text: "¡De nada, Isabel! Seguro que le encanta el regalo. ¡Que tengáis un día maravilloso! 🎁❤️", sender: "bot" }
    ]
  },
  {
    userId: "34689123010",
    userName: "Antonio Moreno",
    personality: PERSONALITIES.IMPATIENT,
    topic: "payment_issue",
    messages: [
      { text: "He intentado pagar 3 veces y no me deja", sender: "user" },
      { text: "Hola Antonio. Lamento que estés teniendo problemas. Déjame ayudarte a resolverlo. ¿Qué mensaje de error te aparece?", sender: "bot" },
      { text: "Dice que la tarjeta no es válida pero es la que uso siempre", sender: "user" },
      { text: "Entiendo tu frustración. Vamos a solucionarlo. Puede ser por varios motivos:\n\n1. Tu banco está bloqueando la compra por seguridad\n2. Has alcanzado el límite diario de tu tarjeta\n3. Los datos introducidos tienen algún error\n\n¿Has recibido algún SMS de tu banco?", sender: "bot" },
      { text: "No, nada", sender: "user" },
      { text: "Vale. ¿Qué número de pedido estás intentando pagar? Déjame revisar en el sistema si hay algún problema.", sender: "bot" },
      { text: "OCC-2025-4967", sender: "user" },
      { text: "Gracias, un momento... Ya lo veo. El pedido está pendiente de pago por 89,99€.\n\nVeo que has intentado 3 veces con tarjeta terminada en 4521. Te recomiendo:\n\n1. Probar con otra tarjeta\n2. Usar PayPal\n3. Transferencia bancaria\n\n¿Cuál prefieres?", sender: "bot" },
      { text: "Que pesadilla... pruebo con otra tarjeta", sender: "user" },
      { text: "Lo siento por las molestias, Antonio. A veces los bancos son muy estrictos con las compras online.\n\nPara facilitarte el proceso, te voy a enviar un enlace directo de pago donde podrás probar con otra tarjeta o PayPal:\n\noccsportplus.es/pagar/OCC-2025-4967\n\n¿Te funciona ahora?", sender: "bot" },
      { text: "Ahora si, ya está pagado", sender: "user" },
      { text: "¡Genial, Antonio! Confirmed tu pago de 89,99€. Ya hemos procesado el pedido y saldrá hoy mismo.\n\nSiento mucho las molestias. Como compensación, te he añadido un 10% de descuento en tu próxima compra. ¿Algo más que necesites?", sender: "bot" },
      { text: "No, gracias", sender: "user" },
      { text: "Perfecto. Gracias por tu paciencia, Antonio. ¡Que tengas un buen día!", sender: "bot" }
    ]
  }
];

// Generate timed messages for all conversations
function generateDemoData() {
  const timedConversations = [];
  let globalTime = 0;

  conversations.forEach((conv, convIndex) => {
    const timedMessages = [];
    let lastTime = globalTime;

    conv.messages.forEach((msg, msgIndex) => {
      const isBot = msg.sender === 'bot';
      const messageTime = generateMessageTime(lastTime, msgIndex, isBot, conv.personality);

      timedMessages.push({
        userId: isBot ? '0' : conv.userId,
        userName: isBot ? 'Infinitix' : conv.userName,
        message: isBot ? msg.text : applyTypos(msg.text, conv.personality === PERSONALITIES.CONFUSED || conv.personality === PERSONALITIES.IMPATIENT ? 0.25 : 0.15),
        timestamp: messageTime
      });

      lastTime = messageTime;
    });

    timedConversations.push({
      ...conv,
      timedMessages
    });

    // Spread conversations over time
    globalTime += Math.floor(Math.random() * 30) + 10;
  });

  return timedConversations;
}

// Convert to webhook POST requests format
function generateWebhookCalls(conversations) {
  const webhookCalls = [];

  conversations.forEach(conv => {
    conv.timedMessages.forEach(msg => {
      if (msg.userId === '0') {
        // Bot message (contact type)
        webhookCalls.push({
          type: 'contact',
          data: {
            user_id: msg.userId,
            name: msg.userName
          },
          timestamp: msg.timestamp,
          conversationId: conv.userId
        });
      }

      // All messages (message type)
      webhookCalls.push({
        type: 'message',
        data: {
          user_id: msg.userId,
          message: msg.message,
          conversation_id: conv.userId
        },
        timestamp: msg.timestamp,
        conversationId: conv.userId
      });
    });
  });

  // Sort by timestamp
  webhookCalls.sort((a, b) => a.timestamp - b.timestamp);

  // Ensure max 3 messages per 5-second window while keeping natural flow
  const redistributedCalls = [];
  const messagesByWindow = new Map(); // window start -> count

  webhookCalls.forEach((call) => {
    let targetTime = call.timestamp;

    // Find which 5-second window this falls into
    let windowStart = Math.floor(targetTime / 5) * 5;

    // Check how many messages are already in this window
    let messagesInWindow = messagesByWindow.get(windowStart) || 0;

    // If window is full (3 messages), find next available window
    while (messagesInWindow >= 3) {
      windowStart += 5;
      messagesInWindow = messagesByWindow.get(windowStart) || 0;
    }

    // Calculate new timestamp within the window to maintain order
    // Spread messages evenly: 0s, 1.5s, 3s within each 5s window
    const offset = messagesInWindow * 1.5;
    targetTime = windowStart + offset;

    redistributedCalls.push({
      ...call,
      timestamp: targetTime
    });

    // Update count for this window
    messagesByWindow.set(windowStart, messagesInWindow + 1);
  });

  return redistributedCalls;
}

module.exports = {
  generateDemoData,
  generateWebhookCalls,
  conversations
};
