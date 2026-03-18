import { Hono } from 'hono'
import { cors } from 'hono/cors'

// ============================================================
// 🤖 BlogMaster Pro v5 - بوت تيليجرام متقدم لإدارة المدونات
// ============================================================
// نظام فريق العمل AI (12 وكيل متخصص):
// ━━━━ فريق الإنتاج ━━━━
// 1. 🔍 باحث الكلمات المفتاحية (Keyword Researcher)
// 2. ✍️ كاتب المقالات (Article Writer)  
// 3. ✂️ محرر المحتوى (Content Editor)
// 4. 🔎 خبير SEO (SEO Expert)
// 5. 🎨 مصمم الصور (Image Designer)
// 6. 🖥️ مهندس HTML (HTML Engineer)
// 7. 📤 ناشر المحتوى (Content Publisher)
// ━━━━ فريق التحليل ━━━━
// 8. 📊 محلل المنافسين (Competitor Analyzer)
// 9. 💡 مولّد الأفكار (Idea Generator)
// 10. 📈 محلل الأداء (Performance Analyst)
// ━━━━ فريق الجودة ━━━━
// 11. 🛡️ مدقق الانتحال (Plagiarism Checker)
// 12. 🌍 مترجم المحتوى (Content Translator)
// ============================================================

type Env = {
  TELEGRAM_BOT_TOKEN: string
  GEMINI_API_KEY: string
  BLOGGER_CLIENT_ID: string
  BLOGGER_CLIENT_SECRET: string
  BLOGGER_REFRESH_TOKEN: string
  BLOGGER_BLOG_ID: string
  HUGGINGFACE_API_KEY: string
  BOT_KV: KVNamespace
  ADMIN_ID: string
  NOTIFY_CHAT_ID: string
}

const app = new Hono<{ Bindings: Env }>()

app.use('/*', cors())

const VERSION = '6.0.0'
const AGENTS_COUNT = 12

// ============================================================
// 🔧 Telegram Webhook Endpoint
// ============================================================
app.post('/webhook/:token', async (c) => {
  const token = c.req.param('token')
  if (token !== c.env.TELEGRAM_BOT_TOKEN) {
    return c.json({ error: 'Unauthorized' }, 401)
  }

  try {
    const update = await c.req.json()

    if (update.message) {
      await handleMessage(c.env, update.message)
    } else if (update.callback_query) {
      await handleCallback(c.env, update.callback_query)
    }

    return c.json({ ok: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return c.json({ ok: true })
  }
})

// ============================================================
// 🔧 Setup Webhook
// ============================================================
app.get('/setup-webhook', async (c) => {
  const botToken = c.env.TELEGRAM_BOT_TOKEN
  if (!botToken || botToken === 'test-token') {
    return c.json({ 
      error: 'TELEGRAM_BOT_TOKEN غير مُعد!',
      fix: 'أضف TELEGRAM_BOT_TOKEN في Settings > Environment Variables على Cloudflare'
    }, 400)
  }

  const host = new URL(c.req.url).origin
  const webhookUrl = `${host}/webhook/${botToken}`

  const response = await fetch(
    `https://api.telegram.org/bot${botToken}/setWebhook`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: webhookUrl,
        max_connections: 40,
        allowed_updates: ['message', 'callback_query']
      })
    }
  )

  const result = await response.json() as any

  // Set bot commands
  await fetch(`https://api.telegram.org/bot${botToken}/setMyCommands`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      commands: [
        { command: 'start', description: '🏠 بدء البوت والقائمة الرئيسية' },
        { command: 'write', description: '✍️ كتابة مقالة كاملة احترافية' },
        { command: 'publish', description: '📤 إنشاء ونشر تلقائي على بلوجر' },
        { command: 'autopilot', description: '🚀 طيار آلي - عدة مقالات دفعة واحدة' },
        { command: 'quickpost', description: '⚡ مقالة سريعة (3 دقائق)' },
        { command: 'keywords', description: '🔍 بحث كلمات مفتاحية متقدم' },
        { command: 'image', description: '🎨 توليد صور بالذكاء الاصطناعي' },
        { command: 'analyze', description: '📊 تحليل نيتش ومنافسين' },
        { command: 'ideas', description: '💡 توليد 20 فكرة مقالة' },
        { command: 'seo', description: '🔎 تحليل SEO لمقالة' },
        { command: 'translate', description: '🌍 ترجمة مقالة (عربي↔إنجليزي)' },
        { command: 'rewrite', description: '🔄 إعادة صياغة بأسلوب مختلف' },
        { command: 'niches', description: '🎯 نيتشات مربحة 2026' },
        { command: 'templates', description: '📋 12 قالب مقالة جاهز' },
        { command: 'schedule', description: '⏰ معلومات الجدولة' },
        { command: 'stats', description: '📈 إحصائياتك' },
        { command: 'settings', description: '⚙️ الإعدادات' },
        { command: 'help', description: '📖 دليل الاستخدام الكامل' },
      ]
    })
  })

  return c.json({
    success: true,
    version: VERSION,
    webhook_url: webhookUrl,
    telegram_response: result,
    message: '✅ Webhook تم إعداده بنجاح! افتح البوت في تيليجرام وأرسل /start'
  })
})

// ============================================================
// 📊 API Status
// ============================================================
app.get('/api/status', async (c) => {
  const botToken = c.env.TELEGRAM_BOT_TOKEN
  let botInfo = null

  try {
    if (botToken && botToken !== 'test-token') {
      const resp = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
      botInfo = await resp.json()
    }
  } catch (e) {}

  return c.json({
    status: 'online',
    version: VERSION,
    bot: botInfo,
    agents: AGENTS_COUNT,
    features: {
      ai_agents: AGENTS_COUNT,
      gemini: !!c.env.GEMINI_API_KEY,
      blogger: !!c.env.BLOGGER_BLOG_ID,
      huggingface: !!c.env.HUGGINGFACE_API_KEY,
      kv_storage: true,
      notifications: !!c.env.NOTIFY_CHAT_ID,
      pollinations_fallback: true,
      image_generation: true,
      multi_template: true,
      auto_pilot: true,
      translation: true,
    }
  })
})

// ============================================================
// ❤️ Health Check
// ============================================================
app.get('/health', (c) => c.json({ 
  status: 'alive', 
  version: VERSION,
  uptime: 'serverless',
  timestamp: new Date().toISOString() 
}))

// ============================================================
// 🏠 Dashboard
// ============================================================
app.get('/', (c) => c.html(getDashboardHTML()))

// ============================================================
// 🤖 AI ENGINE - محرك الذكاء الاصطناعي
// ============================================================

async function callGemini(env: Env, prompt: string, chatId?: number): Promise<string> {
  let apiKey = env.GEMINI_API_KEY
  
  // Check for user's personal key first
  if (chatId && env.BOT_KV) {
    try {
      const userKey = await env.BOT_KV.get(`config:${chatId}:gemini_key`)
      if (userKey) apiKey = userKey
    } catch (e) {}
  }

  if (!apiKey) {
    return await callPollinationsText(prompt)
  }

  const models = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite', 
    'gemini-1.5-flash',
  ]

  for (const model of models) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.85,
              maxOutputTokens: 8192,
              topP: 0.95,
              topK: 40
            },
            safetySettings: [
              { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
            ]
          })
        }
      )

      if (response.ok) {
        const data = await response.json() as any
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) return text
      }
    } catch (e) {
      console.error(`Model ${model} failed:`, e)
    }
  }

  return await callPollinationsText(prompt)
}

// Pollinations AI - مجاني بدون مفتاح وبدون حدود
async function callPollinationsText(prompt: string): Promise<string> {
  try {
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'system', content: 'أنت خبير في كتابة المحتوى والتدوين الاحترافي. أجب بالعربية بشكل مفصل ومهني.' },
          { role: 'user', content: prompt }
        ],
        model: 'openai',
        seed: Math.floor(Math.random() * 99999)
      })
    })
    if (response.ok) {
      const text = await response.text()
      if (text && text.length > 20) return text
    }
  } catch (e) {
    console.error('Pollinations text error:', e)
  }

  // Fallback 2: Pollinations via GET
  try {
    const encoded = encodeURIComponent(prompt.substring(0, 500))
    const resp = await fetch(`https://text.pollinations.ai/${encoded}?model=openai`)
    if (resp.ok) {
      const text = await resp.text()
      if (text && text.length > 20) return text
    }
  } catch (e) {}

  return '⚠️ حدث خطأ مؤقت في توليد المحتوى. حاول مرة أخرى بعد قليل.\n\n💡 نصيحة: تأكد من إعداد مفتاح Gemini عبر /setgemini للحصول على أفضل النتائج.'
}

// توليد الصور - مجاني 100%
async function generateImage(env: Env, prompt: string): Promise<string | null> {
  try {
    const enhancedPrompt = `${prompt}, high quality, professional blog featured image, modern clean design, vibrant colors, 16:9 aspect ratio, digital art`
    const encodedPrompt = encodeURIComponent(enhancedPrompt)
    const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1200&height=630&nologo=true&seed=${Date.now()}`

    const testResp = await fetch(imageUrl, { method: 'HEAD' })
    if (testResp.ok) return imageUrl
  } catch (e) {
    console.error('Image gen error:', e)
  }

  return `https://placehold.co/1200x630/2563eb/white?text=${encodeURIComponent(prompt.substring(0, 25))}`
}


// ============================================================
// 👥 AI AGENTS - فريق العمل (12 وكيل)
// ============================================================

// --- Agent 1: باحث الكلمات المفتاحية ---
async function agentKeywordResearcher(env: Env, topic: string, chatId?: number): Promise<string> {
  const prompt = `أنت خبير SEO عالمي ومتخصص في البحث عن الكلمات المفتاحية.

الموضوع: ${topic}

قدم تحليلاً شاملاً بهذا التنسيق:

🎯 الكلمات المفتاحية الرئيسية (5):
- [كلمة] | حجم البحث التقديري | صعوبة المنافسة (منخفضة/متوسطة/عالية)

📌 كلمات Long-tail (10):
- [عبارة من 3-5 كلمات]

🔗 كلمات LSI ذات صلة (5):
- [كلمة]

💡 عنوان مقالة محسّن لـ SEO (أقل من 60 حرف):
📝 وصف Meta (155 حرف):
🏷️ Tags مقترحة (10):
📊 تقييم صعوبة المنافسة: [منخفضة/متوسطة/عالية]
🎯 نية البحث: [معلوماتي/تجاري/ملاحي/معاملاتي]
💰 RPM التقديري: $[رقم]

أجب بالعربية فقط.`

  return await callGemini(env, prompt, chatId)
}

// --- Agent 2: كاتب المقالات ---
async function agentArticleWriter(env: Env, topic: string, keywords: string, template: string = 'guide', chatId?: number): Promise<string> {
  const templates: Record<string, string> = {
    guide: 'اكتب دليل شامل (Comprehensive Guide) مفصل خطوة بخطوة',
    howto: 'اكتب مقالة كيفية (How-To) عملية مع خطوات واضحة',
    listicle: 'اكتب مقالة قائمة (Listicle) مرقمة مع شرح لكل عنصر',
    comparison: 'اكتب مقارنة شاملة مع جداول وإيجابيات وسلبيات',
    review: 'اكتب مراجعة تفصيلية مع تقييمات ونقاط القوة والضعف',
    tips: 'اكتب نصائح عملية قابلة للتطبيق فوراً',
    mistakes: 'اكتب أخطاء شائعة وكيفية تجنبها',
    beginner: 'اكتب دليل المبتدئين من الصفر بلغة بسيطة',
    trends: 'اكتب عن أحدث الاتجاهات والتوقعات المستقبلية',
    case_study: 'اكتب دراسة حالة مفصلة مع أرقام ونتائج',
    problem_solution: 'اكتب مقالة مشكلة/حل مع تحليل عميق',
    ultimate: 'اكتب المقالة النهائية (Ultimate Guide) الأطول والأشمل',
  }

  const templateGuide = templates[template] || templates.guide

  const prompt = `أنت كاتب محتوى محترف ذو خبرة 15 سنة في كتابة مقالات المدونات الاحترافية.

المطلوب: ${templateGuide}
الموضوع: ${topic}
الكلمات المفتاحية: ${keywords}

التزم بهذه المعايير بدقة:
1. عنوان H1 جذاب يحتوي الكلمة المفتاحية (أقل من 60 حرف)
2. مقدمة Hook قوية تجذب القارئ (200 كلمة)
3. جدول محتويات
4. 6-8 عناوين H2 فرعية
5. 3-5 عناوين H3 تحت كل H2
6. محتوى لا يقل عن 2000 كلمة
7. كثافة الكلمات المفتاحية 1.5-2%
8. فقرات قصيرة (3-4 جمل)
9. قوائم نقطية ومرقمة
10. صناديق ملونة للنصائح والتحذيرات
11. إحصائيات وأرقام
12. خاتمة قوية مع CTA
13. FAQ (5-7 أسئلة)
14. أسلوب بشري طبيعي وممتع

اكتب بصيغة HTML (بدون DOCTYPE/html/head/body).
استخدم: h2, h3, ul, ol, li, strong, em, blockquote, p
أضف تنسيقات CSS inline جذابة.
أضف أيقونات إيموجي في العناوين.
اكتب بالعربية.`

  return await callGemini(env, prompt, chatId)
}

// --- Agent 3: محرر المحتوى ---
async function agentContentEditor(env: Env, article: string, chatId?: number): Promise<string> {
  const prompt = `أنت رئيس تحرير في مجلة رقمية عالمية.

راجع وحسّن المقالة التالية:
${article.substring(0, 6000)}

المطلوب:
1. تصحيح الأخطاء الإملائية والنحوية
2. تحسين تدفق الجمل والانتقالات
3. تنويع بداية الفقرات
4. إضافة كلمات انتقالية
5. جعل المحتوى بشرياً 100%
6. تحسين العناوين لتكون جذابة
7. إضافة Hook في كل قسم
8. إضافة أمثلة عملية
9. تحسين CTA
10. التأكد من أن النص لا يبدو مولداً بالذكاء الاصطناعي

أعد المقالة المحسنة كاملة بنفس صيغة HTML.`

  return await callGemini(env, prompt, chatId)
}

// --- Agent 4: خبير SEO ---
async function agentSeoExpert(env: Env, article: string, keyword: string, chatId?: number): Promise<string> {
  const prompt = `أنت خبير SEO محترف بخبرة 10 سنوات.

الكلمة المفتاحية: ${keyword}
المقالة (أول 3000 حرف):
${article.substring(0, 3000)}

قدم تقريراً شاملاً:

📊 تقييم SEO: [__/100]

✅ نقاط القوة:
1. ...

❌ نقاط الضعف:
1. ...

🔧 التحسينات:
- Title Tag محسّن (60 حرف)
- Meta Description (155 حرف)
- URL Slug مقترح
- Schema Markup (Article + FAQ)
- Open Graph tags

📋 قائمة تدقيق SEO:
☑️ الكلمة في العنوان
☑️ الكلمة في أول 100 كلمة
☑️ الكلمة في H2
☑️ كثافة 1-2%
☑️ صور مع alt
☑️ روابط داخلية/خارجية
☑️ FAQ Schema`

  return await callGemini(env, prompt, chatId)
}

// --- Agent 5: مصمم الصور ---
async function agentImageDesigner(env: Env, topic: string): Promise<string | null> {
  const imagePrompt = `Professional blog header about ${topic}, modern minimalist design, clean typography, vibrant gradient colors, digital illustration style`
  return await generateImage(env, imagePrompt)
}

// --- Agent 6: مهندس HTML ---
async function agentHtmlEngineer(env: Env, article: string, seoData: string, imageUrl: string | null, chatId?: number): Promise<string> {
  const prompt = `أنت مطور ويب متخصص في تنسيق مقالات بلوجر الاحترافية.

حوّل هذه المقالة إلى HTML جاهز للنشر:

المقالة:
${article.substring(0, 5000)}

بيانات SEO:
${seoData.substring(0, 1000)}

${imageUrl ? `رابط الصورة: ${imageUrl}` : ''}

المطلوب:
1. HTML مع CSS inline عصري
2. تصميم responsive للجوال
3. جدول محتويات تفاعلي
4. ألوان: أزرق #2563eb، أخضر #059669، بنفسجي #7c3aed
5. صناديق ملونة للنصائح/تحذيرات/معلومات
6. خط Tajawal من Google Fonts
7. Schema Markup JSON-LD (Article + FAQ)
8. RTL صحيح
9. أزرار مشاركة
10. لا تضع DOCTYPE أو html أو head أو body

أعد HTML فقط بدون شرح.`

  return await callGemini(env, prompt, chatId)
}

// --- Agent 7: ناشر المحتوى (Blogger) ---
async function agentPublisher(env: Env, chatId: number, title: string, content: string, labels: string[] = []): Promise<any> {
  let clientId = env.BLOGGER_CLIENT_ID
  let clientSecret = env.BLOGGER_CLIENT_SECRET
  let refreshToken = env.BLOGGER_REFRESH_TOKEN
  let blogId = env.BLOGGER_BLOG_ID

  if (env.BOT_KV) {
    try {
      const bloggerConfig = await env.BOT_KV.get(`config:${chatId}:blogger`)
      if (bloggerConfig) {
        const config = JSON.parse(bloggerConfig)
        clientId = config.clientId || clientId
        clientSecret = config.clientSecret || clientSecret
        refreshToken = config.refreshToken || refreshToken
        blogId = config.blogId || blogId
      }
    } catch (e) {}
  }

  if (!blogId || !clientId || !clientSecret || !refreshToken) {
    return { error: 'لم يتم إعداد بلوجر. استخدم /setblogger للإعداد' }
  }

  try {
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    })

    const tokenData = await tokenResp.json() as any
    if (!tokenData.access_token) {
      return { error: 'فشل المصادقة. تحقق من بيانات OAuth', details: tokenData }
    }

    const blogResp = await fetch(
      `https://www.googleapis.com/blogger/v3/blogs/${blogId}/posts/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          kind: 'blogger#post',
          blog: { id: blogId },
          title: title,
          content: content,
          labels: labels
        })
      }
    )

    const blogData = await blogResp.json() as any

    if (blogResp.ok) {
      return {
        success: true,
        postId: blogData.id,
        url: blogData.url,
        title: blogData.title,
        published: blogData.published
      }
    } else {
      return { error: `خطأ ${blogResp.status}: ${JSON.stringify(blogData)}` }
    }
  } catch (error: any) {
    return { error: error.message }
  }
}

// --- Agent 8: محلل المنافسين ---
async function agentCompetitorAnalyzer(env: Env, niche: string, chatId?: number): Promise<string> {
  const prompt = `أنت خبير تحليل أسواق رقمية ومحتوى. قم بتحليل شامل للنيتش:

النيتش: ${niche}

📊 نظرة عامة على السوق:
- حجم السوق التقديري
- معدل النمو السنوي
- أهم 5 منافسين (مدونات/مواقع)

🏆 تحليل المنافسين:
| المنافس | نقاط القوة | نقاط الضعف | RPM التقديري |

💡 فجوات المحتوى (Content Gaps):
1. [فجوة] - لماذا هي فرصة ذهبية

🎯 15 فكرة مقالة سريعة النمو:
1. [عنوان] - صعوبة: [منخفضة/متوسطة] - حجم البحث: [تقديري]

📈 استراتيجية 30 يوم:
- الأسبوع 1-4: ...

💰 طرق تحقيق الدخل الأنسب:
1. ...

🔑 10 كلمات مفتاحية أقل تنافسية:
1. [كلمة] - حجم البحث - صعوبة المنافسة

أجب بالعربية.`

  return await callGemini(env, prompt, chatId)
}

// --- Agent 9: مولّد الأفكار ---
async function agentIdeaGenerator(env: Env, niche: string, chatId?: number): Promise<string> {
  const prompt = `أنت خبير في استراتيجية المحتوى وتوليد الأفكار الإبداعية.

النيتش: ${niche}

ولّد 20 فكرة مقالة قوية ومتنوعة:

🔥 أفكار سريعة التصدر (Low Competition):
1-5. [عنوان جذاب] | نوع المقالة | صعوبة المنافسة | حجم البحث التقديري

📈 أفكار شائعة (Trending):
6-10. [عنوان] | سبب الشيوع | الوقت المثالي للنشر

💰 أفكار مربحة (High RPM):
11-15. [عنوان] | RPM التقديري | طريقة الربح

🌟 أفكار إبداعية (Unique Angles):
16-20. [عنوان] | ما يميزها | الجمهور المستهدف

📋 خطة نشر أسبوعية مقترحة:
السبت: ...
الأحد: ...
الاثنين: ...
الثلاثاء: ...
الأربعاء: ...
الخميس: ...
الجمعة: ...

أجب بالعربية.`

  return await callGemini(env, prompt, chatId)
}

// --- Agent 10: محلل الأداء ---
async function agentPerformanceAnalyst(env: Env, chatId: number): Promise<string> {
  let stats: Record<string, string> = {
    created: '0', published: '0', keywords: '0', images: '0',
    analyses: '0', ideas: '0', translations: '0', rewrites: '0', quickposts: '0'
  }

  if (env.BOT_KV) {
    try {
      stats = {
        created: await env.BOT_KV.get(`stats:${chatId}:articles_created`) || '0',
        published: await env.BOT_KV.get(`stats:${chatId}:articles_published`) || '0',
        keywords: await env.BOT_KV.get(`stats:${chatId}:keyword_researches`) || '0',
        images: await env.BOT_KV.get(`stats:${chatId}:images_generated`) || '0',
        analyses: await env.BOT_KV.get(`stats:${chatId}:niche_analyses`) || '0',
        ideas: await env.BOT_KV.get(`stats:${chatId}:ideas_generated`) || '0',
        translations: await env.BOT_KV.get(`stats:${chatId}:translations`) || '0',
        rewrites: await env.BOT_KV.get(`stats:${chatId}:rewrites`) || '0',
        quickposts: await env.BOT_KV.get(`stats:${chatId}:quickposts`) || '0',
      }
    } catch (e) {}
  }

  const total = Object.values(stats).reduce((a, b) => a + parseInt(b), 0)

  return `
📊 <b>تقرير الأداء الشامل</b>

━━━ 📈 الإنتاج ━━━
✍️ مقالات مُنشأة: <b>${stats.created}</b>
📤 مقالات منشورة: <b>${stats.published}</b>
⚡ مقالات سريعة: <b>${stats.quickposts}</b>
🔍 أبحاث كلمات: <b>${stats.keywords}</b>
🎨 صور مُولّدة: <b>${stats.images}</b>

━━━ 📊 التحليل ━━━
📊 تحليلات نيتش: <b>${stats.analyses}</b>
💡 أفكار مولّدة: <b>${stats.ideas}</b>
🌍 ترجمات: <b>${stats.translations}</b>
🔄 إعادة صياغة: <b>${stats.rewrites}</b>

━━━ 📋 الملخص ━━━
🔢 إجمالي العمليات: <b>${total}</b>
📅 التاريخ: ${new Date().toLocaleDateString('ar')}

${parseInt(stats.published) > 0 ? `🏆 معدل النشر: ${((parseInt(stats.published) / parseInt(stats.created)) * 100).toFixed(0)}%` : '💡 ابدأ بالنشر عبر /publish'}

💪 استمر في الكتابة! الاتساق هو مفتاح النجاح.`
}

// --- Agent 11: مدقق الانتحال ---
async function agentOriginalityChecker(env: Env, article: string, chatId?: number): Promise<string> {
  const prompt = `أنت خبير في تدقيق المحتوى والأصالة.

حلل المقالة التالية من حيث الأصالة:
${article.substring(0, 3000)}

قدم تقريراً:

🛡️ نسبة الأصالة التقديرية: [__]%

✅ العناصر الأصلية:
1. ...

⚠️ عبارات قد تحتاج إعادة صياغة:
1. [العبارة] → [البديل المقترح]

🔧 تحسينات لزيادة الأصالة:
1. ...

💡 نصائح لكتابة محتوى فريد:
1. ...

أجب بالعربية.`

  return await callGemini(env, prompt, chatId)
}

// --- Agent 12: مترجم المحتوى ---
async function agentTranslator(env: Env, text: string, direction: string = 'ar_to_en', chatId?: number): Promise<string> {
  const directionText = direction === 'ar_to_en' 
    ? 'ترجم من العربية إلى الإنجليزية' 
    : 'ترجم من الإنجليزية إلى العربية'

  const prompt = `أنت مترجم محترف متخصص في ترجمة محتوى المدونات.

${directionText}

النص:
${text.substring(0, 5000)}

المطلوب:
1. ترجمة دقيقة ومهنية
2. الحفاظ على تنسيق HTML إن وجد
3. تكييف التعبيرات الثقافية
4. الحفاظ على SEO (الكلمات المفتاحية)
5. أسلوب طبيعي وليس حرفي

أعد الترجمة فقط بدون شرح.`

  return await callGemini(env, prompt, chatId)
}

// ============================================================
// 💬 Telegram Helpers
// ============================================================
async function sendMessage(env: Env, chatId: number, text: string, options: any = {}) {
  const chunks = splitMessage(text, 4000)
  for (let i = 0; i < chunks.length; i++) {
    await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: chunks[i],
        parse_mode: options.parse_mode || 'HTML',
        reply_markup: i === chunks.length - 1 ? options.reply_markup : undefined,
        disable_web_page_preview: options.disable_web_page_preview ?? true
      })
    })
  }
}

function splitMessage(text: string, maxLength: number): string[] {
  if (text.length <= maxLength) return [text]
  const chunks: string[] = []
  let remaining = text
  while (remaining.length > 0) {
    if (remaining.length <= maxLength) { chunks.push(remaining); break }
    let idx = remaining.lastIndexOf('\n', maxLength)
    if (idx === -1 || idx < maxLength / 2) idx = remaining.lastIndexOf(' ', maxLength)
    if (idx === -1) idx = maxLength
    chunks.push(remaining.substring(0, idx))
    remaining = remaining.substring(idx).trim()
  }
  return chunks
}

async function sendPhoto(env: Env, chatId: number, url: string, caption: string = '') {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendPhoto`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, photo: url, caption: caption.substring(0, 1024), parse_mode: 'HTML' })
  })
}

async function sendDocument(env: Env, chatId: number, content: string, filename: string, caption: string = '') {
  const blob = new Blob([content], { type: 'text/html' })
  const formData = new FormData()
  formData.append('chat_id', String(chatId))
  formData.append('document', blob, filename)
  if (caption) formData.append('caption', caption.substring(0, 1024))
  formData.append('parse_mode', 'HTML')
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendDocument`, { method: 'POST', body: formData })
}

async function answerCallback(env: Env, callbackId: string, text: string) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text, show_alert: false })
  })
}

async function editMessage(env: Env, chatId: number, messageId: number, text: string, options: any = {}) {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId, message_id: messageId, text,
      parse_mode: options.parse_mode || 'HTML',
      reply_markup: options.reply_markup,
      disable_web_page_preview: true
    })
  })
}

// ============================================================
// 💾 KV Storage Helpers (مع حماية من عدم توفر KV)
// ============================================================
async function getUserState(env: Env, chatId: number): Promise<any> {
  if (!env.BOT_KV) return null
  try { const s = await env.BOT_KV.get(`state:${chatId}`); return s ? JSON.parse(s) : null } catch { return null }
}
async function setUserState(env: Env, chatId: number, state: any) {
  if (!env.BOT_KV) return
  try { await env.BOT_KV.put(`state:${chatId}`, JSON.stringify(state), { expirationTtl: 3600 }) } catch {}
}
async function clearUserState(env: Env, chatId: number) { 
  if (!env.BOT_KV) return
  try { await env.BOT_KV.delete(`state:${chatId}`) } catch {} 
}
async function incrementStat(env: Env, chatId: number, stat: string) {
  if (!env.BOT_KV) return
  try {
    const key = `stats:${chatId}:${stat}`
    const current = parseInt(await env.BOT_KV.get(key) || '0')
    await env.BOT_KV.put(key, String(current + 1))
  } catch {}
}
async function notifyAdmin(env: Env, message: string) {
  const chatId = env.NOTIFY_CHAT_ID || env.ADMIN_ID
  if (chatId) {
    try { await sendMessage(env, parseInt(chatId), `🔔 <b>تنبيه النظام</b>\n\n${message}`) } catch {}
  }
}

// ============================================================
// 📨 Message Handler
// ============================================================
async function handleMessage(env: Env, message: any) {
  const chatId = message.chat.id
  const text = message.text || ''
  const firstName = message.from?.first_name || 'صديقي'
  const userState = await getUserState(env, chatId)

  if (text.startsWith('/')) {
    const [command, ...args] = text.split(' ')
    const argText = args.join(' ')

    switch (command.split('@')[0]) {
      case '/start':
        await handleStart(env, chatId, firstName); break

      case '/help':
        await handleHelp(env, chatId); break

      case '/write':
      case '/article':
        if (argText) {
          await handleFullArticleFlow(env, chatId, argText)
        } else {
          await setUserState(env, chatId, { action: 'waiting_topic' })
          await sendMessage(env, chatId,
            '✍️ <b>كاتب المقالات الاحترافي</b>\n\n📝 أرسل الموضوع:\n\n' +
            '<i>مثال: أفضل طرق الربح من الإنترنت 2026</i>\n' +
            '<i>مثال: دليل شامل للذكاء الاصطناعي</i>')
        }
        break

      case '/publish':
        if (argText) {
          await handlePublishFlow(env, chatId, argText)
        } else {
          await setUserState(env, chatId, { action: 'waiting_publish_topic' })
          await sendMessage(env, chatId,
            '📤 <b>النشر التلقائي على بلوجر</b>\n\n📝 أرسل موضوع المقالة:\n\n' +
            '⚡ فريق العمل الكامل (7 وكلاء) سيقوم بـ:\n' +
            '1️⃣ بحث كلمات مفتاحية\n2️⃣ كتابة المقالة (+2000 كلمة)\n' +
            '3️⃣ تحرير وتحسين\n4️⃣ تحسين SEO\n5️⃣ توليد صورة\n' +
            '6️⃣ تنسيق HTML\n7️⃣ النشر على بلوجر')
        }
        break

      case '/quickpost':
        if (argText) {
          await handleQuickPost(env, chatId, argText)
        } else {
          await setUserState(env, chatId, { action: 'waiting_quickpost' })
          await sendMessage(env, chatId,
            '⚡ <b>مقالة سريعة</b>\n\n📝 أرسل الموضوع:\n' +
            '(كتابة + صورة + HTML في 3 دقائق)')
        }
        break

      case '/keywords':
        if (argText) {
          await handleKeywordResearch(env, chatId, argText)
        } else {
          await setUserState(env, chatId, { action: 'waiting_keywords' })
          await sendMessage(env, chatId, '🔍 <b>باحث الكلمات المفتاحية</b>\n\n📝 أرسل الموضوع:')
        }
        break

      case '/image':
        if (argText) {
          await handleImageGeneration(env, chatId, argText)
        } else {
          await setUserState(env, chatId, { action: 'waiting_image' })
          await sendMessage(env, chatId,
            '🎨 <b>مصمم الصور AI</b>\n\n📝 صف الصورة (الإنجليزية أفضل):\n' +
            '<i>مثال: Professional blog header about AI technology</i>')
        }
        break

      case '/analyze':
        if (argText) {
          await handleNicheAnalysis(env, chatId, argText)
        } else {
          await setUserState(env, chatId, { action: 'waiting_niche' })
          await sendMessage(env, chatId, '📊 <b>محلل المنافسين</b>\n\n📝 أرسل النيتش أو المجال:')
        }
        break

      case '/ideas':
        if (argText) {
          await handleIdeas(env, chatId, argText)
        } else {
          await setUserState(env, chatId, { action: 'waiting_ideas' })
          await sendMessage(env, chatId, '💡 <b>مولّد الأفكار</b>\n\n📝 أرسل النيتش لتوليد 20 فكرة مقالة:')
        }
        break

      case '/translate':
        if (argText) {
          await handleTranslation(env, chatId, argText)
        } else {
          await setUserState(env, chatId, { action: 'waiting_translate' })
          await sendMessage(env, chatId,
            '🌍 <b>مترجم المحتوى</b>\n\n📝 أرسل النص لترجمته:\n' +
            '(عربي→إنجليزي تلقائياً، أضف "en" في البداية للعكس)')
        }
        break

      case '/rewrite':
        if (argText) {
          await handleRewrite(env, chatId, argText)
        } else {
          await setUserState(env, chatId, { action: 'waiting_rewrite' })
          await sendMessage(env, chatId,
            '🔄 <b>إعادة الصياغة</b>\n\n📝 أرسل النص لإعادة صياغته بأسلوب مختلف:')
        }
        break

      case '/seo':
        await setUserState(env, chatId, { action: 'waiting_seo' })
        await sendMessage(env, chatId,
          '🔎 <b>خبير SEO</b>\n\n📝 أرسل: الكلمة المفتاحية | نص المقالة\n' +
          '<i>أو الكلمة المفتاحية فقط لتحليل آخر مقالة</i>')
        break

      case '/autopilot':
        if (argText) {
          await handleAutoPilot(env, chatId, argText)
        } else {
          await sendMessage(env, chatId,
            '🚀 <b>الطيار الآلي</b>\n\nأرسل قائمة مواضيع (كل موضوع في سطر):\n\n' +
            '<code>/autopilot\nأفضل طرق الربح 2026\nكيف تبدأ مشروعك\nأفضل تطبيقات AI المجانية</code>')
        }
        break

      case '/niches':
        await handleNicheSuggestions(env, chatId); break
      case '/templates':
        await handleTemplates(env, chatId); break
      case '/schedule':
        await handleScheduleInfo(env, chatId); break
      case '/stats':
        const report = await agentPerformanceAnalyst(env, chatId)
        await sendMessage(env, chatId, report); break
      case '/settings':
        await handleSettings(env, chatId); break

      case '/setgemini':
        if (argText) {
          if (env.BOT_KV) {
            await env.BOT_KV.put(`config:${chatId}:gemini_key`, argText.trim())
          }
          await sendMessage(env, chatId, '✅ تم حفظ مفتاح Gemini API بنجاح! 🎉\n\nالآن أنت تستخدم نموذج Gemini 2.0 Flash المتقدم.')
        } else {
          await sendMessage(env, chatId,
            '📝 <b>إعداد مفتاح Gemini AI</b>\n\n' +
            '1. اذهب إلى: <a href="https://aistudio.google.com/apikey">aistudio.google.com/apikey</a>\n' +
            '2. اضغط "Create API Key"\n' +
            '3. انسخ المفتاح وأرسل:\n' +
            '<code>/setgemini مفتاحك_هنا</code>')
        }
        break

      case '/setblogger':
        if (argText && argText.includes('|')) {
          const parts = argText.split('|').map(s => s.trim())
          if (parts.length >= 4 && env.BOT_KV) {
            await env.BOT_KV.put(`config:${chatId}:blogger`, JSON.stringify({
              clientId: parts[0], clientSecret: parts[1],
              refreshToken: parts[2], blogId: parts[3]
            }))
            await sendMessage(env, chatId, '✅ تم حفظ إعدادات بلوجر بنجاح! 🎉\n\nالآن يمكنك استخدام /publish للنشر التلقائي.')
          } else {
            await sendMessage(env, chatId, '❌ الصيغة غير صحيحة. تحتاج 4 قيم مفصولة بـ |')
          }
        } else {
          await sendMessage(env, chatId, getBloggerSetupGuide())
        }
        break

      default:
        await sendMessage(env, chatId, '❓ أمر غير معروف. أرسل /help للمساعدة.')
    }
    return
  }

  // Handle states
  if (userState?.action) {
    switch (userState.action) {
      case 'waiting_topic':
        await clearUserState(env, chatId)
        await handleFullArticleFlow(env, chatId, text, userState.template); break
      case 'waiting_keywords':
        await clearUserState(env, chatId)
        await handleKeywordResearch(env, chatId, text); break
      case 'waiting_image':
        await clearUserState(env, chatId)
        await handleImageGeneration(env, chatId, text); break
      case 'waiting_niche':
        await clearUserState(env, chatId)
        await handleNicheAnalysis(env, chatId, text); break
      case 'waiting_publish_topic':
        await clearUserState(env, chatId)
        await handlePublishFlow(env, chatId, text); break
      case 'waiting_quickpost':
        await clearUserState(env, chatId)
        await handleQuickPost(env, chatId, text); break
      case 'waiting_ideas':
        await clearUserState(env, chatId)
        await handleIdeas(env, chatId, text); break
      case 'waiting_translate':
        await clearUserState(env, chatId)
        await handleTranslation(env, chatId, text); break
      case 'waiting_rewrite':
        await clearUserState(env, chatId)
        await handleRewrite(env, chatId, text); break
      case 'waiting_seo':
        await clearUserState(env, chatId)
        if (text.includes('|')) {
          const [kw, ...parts] = text.split('|')
          await handleSEOAnalysis(env, chatId, kw.trim(), parts.join('|').trim())
        } else {
          let lastArticle = null
          if (env.BOT_KV) {
            try { const last = await env.BOT_KV.get(`last_article:${chatId}`); if (last) lastArticle = JSON.parse(last) } catch {}
          }
          if (lastArticle) {
            await handleSEOAnalysis(env, chatId, text, lastArticle.content?.substring(0, 3000) || '')
          } else {
            await sendMessage(env, chatId, '❌ لا توجد مقالة محفوظة. أرسل: الكلمة المفتاحية | نص المقالة')
          }
        }
        break
      default:
        await handleFreeChat(env, chatId, text)
    }
    return
  }

  await handleFreeChat(env, chatId, text)
}

// ============================================================
// 🔘 Callback Handler
// ============================================================
async function handleCallback(env: Env, callback: any) {
  const chatId = callback.message?.chat.id
  const data = callback.data

  await answerCallback(env, callback.id, '⏳ جاري المعالجة...')

  if (data.startsWith('niche_')) {
    const niche = decodeURIComponent(data.replace('niche_', ''))
    if (niche) await handleNicheAnalysis(env, chatId, niche)
  } else if (data.startsWith('write_')) {
    const topic = decodeURIComponent(data.replace('write_', ''))
    if (topic) await handleFullArticleFlow(env, chatId, topic)
  } else if (data.startsWith('ideas_')) {
    const niche = decodeURIComponent(data.replace('ideas_', ''))
    if (niche) await handleIdeas(env, chatId, niche)
  } else if (data.startsWith('tpl_')) {
    const template = data.replace('tpl_', '')
    await setUserState(env, chatId, { action: 'waiting_topic', template })
    await sendMessage(env, chatId, `✅ القالب: <b>${template}</b>\n\n📝 أرسل الموضوع:`)
  } else if (data === 'publish_last') {
    let lastArticle = null
    if (env.BOT_KV) { try { const l = await env.BOT_KV.get(`last_article:${chatId}`); if (l) lastArticle = JSON.parse(l) } catch {} }
    if (lastArticle) {
      await sendMessage(env, chatId, '📤 جاري النشر على بلوجر...')
      const result = await agentPublisher(env, chatId, lastArticle.title, lastArticle.html || lastArticle.content, lastArticle.labels || [])
      if (result.success) {
        await sendMessage(env, chatId, `✅ <b>تم النشر!</b> 🎉\n\n📋 ${lastArticle.title}\n🔗 ${result.url}`)
        await incrementStat(env, chatId, 'articles_published')
        await notifyAdmin(env, `📤 نُشرت: ${lastArticle.title}\n🔗 ${result.url}`)
      } else {
        await sendMessage(env, chatId, `❌ فشل: ${result.error}\n\n/setblogger للإعداد`)
      }
    }
  } else if (data === 'download_html') {
    let lastArticle = null
    if (env.BOT_KV) { try { const l = await env.BOT_KV.get(`last_article:${chatId}`); if (l) lastArticle = JSON.parse(l) } catch {} }
    if (lastArticle) {
      await sendDocument(env, chatId, lastArticle.html || lastArticle.content, `article_${Date.now()}.html`, '📄 ملف HTML جاهز')
    }
  } else if (data === 'check_original') {
    let lastArticle = null
    if (env.BOT_KV) { try { const l = await env.BOT_KV.get(`last_article:${chatId}`); if (l) lastArticle = JSON.parse(l) } catch {} }
    if (lastArticle) {
      await sendMessage(env, chatId, '🛡️ جاري فحص الأصالة...')
      const result = await agentOriginalityChecker(env, lastArticle.content || lastArticle.html, chatId)
      await sendMessage(env, chatId, result)
    }
  } else if (data === 'translate_last') {
    let lastArticle = null
    if (env.BOT_KV) { try { const l = await env.BOT_KV.get(`last_article:${chatId}`); if (l) lastArticle = JSON.parse(l) } catch {} }
    if (lastArticle) {
      await sendMessage(env, chatId, '🌍 جاري الترجمة...')
      const translated = await agentTranslator(env, lastArticle.content || lastArticle.html, 'ar_to_en', chatId)
      await sendMessage(env, chatId, translated.substring(0, 4000))
      await incrementStat(env, chatId, 'translations')
    }
  } else if (data === 'niche_suggestions') {
    await handleNicheSuggestions(env, chatId)
  } else if (data === 'templates') {
    await handleTemplates(env, chatId)
  } else if (data === 'settings') {
    await handleSettings(env, chatId)
  } else if (data === 'help') {
    await handleHelp(env, chatId)
  }
}

// ============================================================
// 🎬 Flow Handlers
// ============================================================

async function handleStart(env: Env, chatId: number, firstName: string) {
  const msg = `
🤖 <b>مرحباً ${firstName}! أنا BlogMaster Pro v5</b>

🚀 <b>أقوى بوت لإدارة المدونات بالذكاء الاصطناعي!</b>

👥 <b>فريق العمل (${AGENTS_COUNT} وكيل AI):</b>
🔍 باحث كلمات مفتاحية | ✍️ كاتب مقالات
✂️ محرر محتوى | 🔎 خبير SEO
🎨 مصمم صور | 🖥️ مهندس HTML
📤 ناشر محتوى | 📊 محلل منافسين
💡 مولّد أفكار | 📈 محلل أداء
🛡️ مدقق أصالة | 🌍 مترجم محتوى

⚡ <b>أوامر سريعة:</b>
/write - كتابة مقالة كاملة
/quickpost - مقالة سريعة (3 دقائق!)
/publish - إنشاء + نشر تلقائي
/autopilot - طيار آلي (عدة مقالات)
/ideas - 20 فكرة مقالة
/analyze - تحليل منافسين
/translate - ترجمة محتوى

⚙️ <b>الإعداد السريع:</b>
1️⃣ <a href="https://aistudio.google.com/apikey">احصل على مفتاح Gemini مجاناً</a>
2️⃣ أرسل: <code>/setgemini مفتاحك</code>
3️⃣ ابدأ بـ /write !

💡 البوت يعمل حتى بدون مفاتيح عبر Pollinations AI المجاني!
💬 أرسل أي رسالة للدردشة مع المساعد.`

  const keyboard = {
    inline_keyboard: [
      [
        { text: '✍️ كتابة مقالة', callback_data: 'write_' },
        { text: '⚡ مقالة سريعة', callback_data: 'write_quick' }
      ],
      [
        { text: '💡 أفكار مقالات', callback_data: 'ideas_' },
        { text: '📊 تحليل نيتش', callback_data: 'niche_' }
      ],
      [
        { text: '🎯 نيتشات مربحة', callback_data: 'niche_suggestions' },
        { text: '📋 القوالب', callback_data: 'templates' }
      ],
      [
        { text: '⚙️ الإعدادات', callback_data: 'settings' },
        { text: '📖 المساعدة', callback_data: 'help' }
      ]
    ]
  }

  await sendMessage(env, chatId, msg, { reply_markup: keyboard })
}

async function handleHelp(env: Env, chatId: number) {
  await sendMessage(env, chatId, `
📖 <b>دليل BlogMaster Pro v5</b>

━━━ ✍️ <b>كتابة</b> ━━━
<code>/write موضوع</code> → مقالة كاملة (4 وكلاء)
<code>/quickpost موضوع</code> → مقالة سريعة (3 دقائق)
<code>/rewrite نص</code> → إعادة صياغة

━━━ 📤 <b>نشر</b> ━━━
<code>/publish موضوع</code> → إنشاء + نشر على بلوجر
<code>/autopilot</code> → طيار آلي

━━━ 🔍 <b>بحث</b> ━━━
<code>/keywords موضوع</code> → كلمات مفتاحية
<code>/analyze نيتش</code> → تحليل منافسين
<code>/ideas نيتش</code> → 20 فكرة مقالة
<code>/seo</code> → تحليل SEO

━━━ 🎨 <b>وسائط</b> ━━━
<code>/image وصف</code> → توليد صورة AI
<code>/translate نص</code> → ترجمة (عربي↔إنجليزي)

━━━ ⚙️ <b>إعداد</b> ━━━
مفتاح Gemini: <a href="https://aistudio.google.com/apikey">مجاني هنا</a>
<code>/setgemini KEY</code>
<code>/setblogger بيانات</code>

💡 البوت يعمل بدون مفاتيح عبر Pollinations AI!`)
}

// --- Full Article Flow (4 Agents) ---
async function handleFullArticleFlow(env: Env, chatId: number, topic: string, template: string = 'guide') {
  await sendMessage(env, chatId,
    `🚀 <b>بدء إنشاء المقالة</b>\n\n📋 <b>${topic}</b>\n📄 القالب: ${template}\n\n` +
    `⏳ 4 وكلاء AI يعملون الآن:\n` +
    `1️⃣ 🔍 بحث كلمات مفتاحية...\n2️⃣ ✍️ كتابة المقالة...\n` +
    `3️⃣ ✂️ تحرير وتحسين...\n4️⃣ 🔎 تحليل SEO...\n\n⏱️ 2-4 دقائق`)

  // Step 1
  await sendMessage(env, chatId, '🔍 <b>[1/4]</b> بحث كلمات مفتاحية...')
  const keywords = await agentKeywordResearcher(env, topic, chatId)
  await sendMessage(env, chatId, `🔍 <b>نتائج البحث:</b>\n\n${keywords.substring(0, 3000)}`)

  // Step 2
  await sendMessage(env, chatId, '✍️ <b>[2/4]</b> كتابة المقالة (+2000 كلمة)...')
  const article = await agentArticleWriter(env, topic, keywords, template, chatId)

  // Step 3
  await sendMessage(env, chatId, '✂️ <b>[3/4]</b> تحرير وتحسين...')
  const edited = await agentContentEditor(env, article, chatId)

  // Step 4
  await sendMessage(env, chatId, '🔎 <b>[4/4]</b> تحليل SEO...')
  const seo = await agentSeoExpert(env, edited, topic.split(' ').slice(0, 4).join(' '), chatId)

  // Save
  const data = {
    title: topic, content: edited, html: edited,
    keywords, seo, labels: [topic.split(' ')[0], 'مقالات'],
    template, createdAt: new Date().toISOString()
  }
  if (env.BOT_KV) { try { await env.BOT_KV.put(`last_article:${chatId}`, JSON.stringify(data)) } catch {} }
  await incrementStat(env, chatId, 'articles_created')

  await sendMessage(env, chatId, `✅ <b>تم إنشاء المقالة!</b> 🎉\n\n📋 <b>${topic}</b>\n\n📊 تقرير SEO:\n${seo.substring(0, 1500)}`)
  await sendMessage(env, chatId, edited.substring(0, 4000), { parse_mode: 'HTML' })

  await sendMessage(env, chatId, '👇 ماذا تريد أن تفعل؟', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📤 نشر على بلوجر', callback_data: 'publish_last' }],
        [{ text: '📥 تحميل HTML', callback_data: 'download_html' }],
        [{ text: '🛡️ فحص الأصالة', callback_data: 'check_original' }],
        [{ text: '🌍 ترجمة للإنجليزية', callback_data: 'translate_last' }],
      ]
    }
  })
}

// --- Quick Post (Fast 3-min article) ---
async function handleQuickPost(env: Env, chatId: number, topic: string) {
  await sendMessage(env, chatId, `⚡ <b>مقالة سريعة</b>\n📋 ${topic}\n⏱️ ~3 دقائق`)

  await sendMessage(env, chatId, '✍️ جاري الكتابة والتنسيق...')
  const article = await agentArticleWriter(env, topic, topic, 'tips', chatId)

  await sendMessage(env, chatId, '🎨 جاري توليد الصورة...')
  const imageUrl = await agentImageDesigner(env, topic)

  let html = article
  if (imageUrl) {
    html = `<div style="text-align:center;margin-bottom:20px"><img src="${imageUrl}" alt="${topic}" style="max-width:100%;border-radius:12px" /></div>\n${article}`
  }

  if (env.BOT_KV) {
    try {
      await env.BOT_KV.put(`last_article:${chatId}`, JSON.stringify({
        title: topic, content: article, html, labels: [topic.split(' ')[0]],
        imageUrl, createdAt: new Date().toISOString()
      }))
    } catch {}
  }
  await incrementStat(env, chatId, 'quickposts')

  await sendMessage(env, chatId, `✅ <b>المقالة جاهزة!</b>\n📋 ${topic}`)
  if (imageUrl) await sendPhoto(env, chatId, imageUrl, `🎨 الصورة البارزة`)
  await sendMessage(env, chatId, article.substring(0, 4000), { parse_mode: 'HTML' })

  await sendMessage(env, chatId, '👇', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📤 نشر على بلوجر', callback_data: 'publish_last' }],
        [{ text: '📥 تحميل HTML', callback_data: 'download_html' }],
      ]
    }
  })
}

// --- Publish Flow (7 Agents) ---
async function handlePublishFlow(env: Env, chatId: number, topic: string) {
  await sendMessage(env, chatId,
    `🚀 <b>خط الإنتاج الكامل</b>\n📋 <b>${topic}</b>\n\n` +
    `⏳ 7 مراحل:\n1️⃣ 🔍 كلمات مفتاحية\n2️⃣ ✍️ كتابة\n3️⃣ ✂️ تحرير\n` +
    `4️⃣ 🔎 SEO\n5️⃣ 🎨 صورة\n6️⃣ 🖥️ HTML\n7️⃣ 📤 نشر\n\n⏱️ 3-6 دقائق`)

  await sendMessage(env, chatId, '🔍 <b>[1/7]</b> كلمات مفتاحية...')
  const keywords = await agentKeywordResearcher(env, topic, chatId)

  await sendMessage(env, chatId, '✍️ <b>[2/7]</b> كتابة المقالة...')
  const article = await agentArticleWriter(env, topic, keywords, 'guide', chatId)

  await sendMessage(env, chatId, '✂️ <b>[3/7]</b> تحرير...')
  const edited = await agentContentEditor(env, article, chatId)

  await sendMessage(env, chatId, '🔎 <b>[4/7]</b> SEO...')
  const seoData = await agentSeoExpert(env, edited, topic.split(' ').slice(0, 3).join(' '), chatId)

  await sendMessage(env, chatId, '🎨 <b>[5/7]</b> صورة بارزة...')
  const imageUrl = await agentImageDesigner(env, topic)

  await sendMessage(env, chatId, '🖥️ <b>[6/7]</b> HTML احترافي...')
  const finalHTML = await agentHtmlEngineer(env, edited, seoData, imageUrl, chatId)

  let publishContent = finalHTML
  if (imageUrl) {
    publishContent = `<div style="text-align:center;margin-bottom:24px"><img src="${imageUrl}" alt="${topic}" style="max-width:100%;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,0.15)" /></div>\n${finalHTML}`
  }

  await sendMessage(env, chatId, '📤 <b>[7/7]</b> النشر على بلوجر...')
  const labels = [topic.split(' ')[0], 'مقالات', '2026']
  const result = await agentPublisher(env, chatId, topic, publishContent, labels)

  if (env.BOT_KV) {
    try {
      await env.BOT_KV.put(`last_article:${chatId}`, JSON.stringify({
        title: topic, content: edited, html: publishContent,
        keywords, seo: seoData, labels, imageUrl,
        createdAt: new Date().toISOString()
      }))
    } catch {}
  }

  if (result.success) {
    await sendMessage(env, chatId,
      `✅ <b>تم النشر بنجاح!</b> 🎉🎊\n\n` +
      `📋 <b>${topic}</b>\n🔗 ${result.url}\n📅 ${new Date().toLocaleDateString('ar')}\n\n` +
      `🏭 فريق العمل:\n✅ باحث | ✅ كاتب | ✅ محرر | ✅ SEO | ✅ مصمم | ✅ HTML | ✅ ناشر`)
    if (imageUrl) await sendPhoto(env, chatId, imageUrl, '🎨 الصورة البارزة')
    await incrementStat(env, chatId, 'articles_published')
    await notifyAdmin(env, `📤 نُشرت: ${topic}\n🔗 ${result.url}`)
  } else {
    await sendMessage(env, chatId,
      `❌ <b>فشل النشر</b>\n${result.error}\n\n💡 /setblogger للإعداد\n📝 المقالة محفوظة.`,
      { reply_markup: { inline_keyboard: [
        [{ text: '📥 تحميل HTML', callback_data: 'download_html' }],
        [{ text: '🔄 إعادة المحاولة', callback_data: 'publish_last' }]
      ] } })
    await incrementStat(env, chatId, 'articles_created')
  }
}

// --- Other Handlers ---
async function handleKeywordResearch(env: Env, chatId: number, topic: string) {
  await sendMessage(env, chatId, `🔍 تحليل: <b>${topic}</b>...`)
  const result = await agentKeywordResearcher(env, topic, chatId)
  await sendMessage(env, chatId, result)
  await incrementStat(env, chatId, 'keyword_researches')
}

async function handleImageGeneration(env: Env, chatId: number, prompt: string) {
  await sendMessage(env, chatId, '🎨 توليد الصورة...')
  const url = await generateImage(env, prompt)
  if (url) {
    await sendPhoto(env, chatId, url, `🎨 <b>جاهزة!</b>\n📝 ${prompt}`)
    await incrementStat(env, chatId, 'images_generated')
  } else {
    await sendMessage(env, chatId, '❌ فشل. حاول مرة أخرى.')
  }
}

async function handleNicheAnalysis(env: Env, chatId: number, niche: string) {
  await sendMessage(env, chatId, `📊 تحليل: <b>${niche}</b>...\n⏱️ 1-2 دقيقة`)
  const result = await agentCompetitorAnalyzer(env, niche, chatId)
  await sendMessage(env, chatId, result)
  await incrementStat(env, chatId, 'niche_analyses')
}

async function handleIdeas(env: Env, chatId: number, niche: string) {
  await sendMessage(env, chatId, `💡 توليد أفكار لـ: <b>${niche}</b>...`)
  const result = await agentIdeaGenerator(env, niche, chatId)
  await sendMessage(env, chatId, result)
  await incrementStat(env, chatId, 'ideas_generated')
}

async function handleTranslation(env: Env, chatId: number, text: string) {
  const direction = text.toLowerCase().startsWith('en ') ? 'en_to_ar' : 'ar_to_en'
  const cleanText = text.replace(/^en\s+/i, '')
  await sendMessage(env, chatId, `🌍 ترجمة... (${direction === 'ar_to_en' ? 'عربي→إنجليزي' : 'إنجليزي→عربي'})`)
  const result = await agentTranslator(env, cleanText, direction, chatId)
  await sendMessage(env, chatId, result)
  await incrementStat(env, chatId, 'translations')
}

async function handleRewrite(env: Env, chatId: number, text: string) {
  await sendMessage(env, chatId, '🔄 إعادة صياغة...')
  const prompt = `أعد صياغة النص التالي بأسلوب مختلف وأكثر احترافية، مع الحفاظ على المعنى:

${text.substring(0, 4000)}

اجعل النص:
1. أكثر جاذبية وتشويقاً
2. بأسلوب بشري طبيعي
3. مع تحسين التدفق
4. مع إضافة تفاصيل وأمثلة
5. الحفاظ على HTML إن وجد

أعد النص المعاد صياغته فقط.`

  const result = await callGemini(env, prompt, chatId)
  await sendMessage(env, chatId, result)
  await incrementStat(env, chatId, 'rewrites')
}

async function handleSEOAnalysis(env: Env, chatId: number, keyword: string, article: string) {
  await sendMessage(env, chatId, `🔎 تحليل SEO: <b>${keyword}</b>...`)
  const result = await agentSeoExpert(env, article, keyword, chatId)
  await sendMessage(env, chatId, result)
}

async function handleAutoPilot(env: Env, chatId: number, topicsText: string) {
  const topics = topicsText.split('\n').filter(t => t.trim().length > 0)
  if (topics.length === 0) { await sendMessage(env, chatId, '❌ لم يتم العثور على مواضيع.'); return }

  await sendMessage(env, chatId,
    `🚀 <b>الطيار الآلي</b>\n📋 ${topics.length} مقالات\n⏱️ ~${topics.length * 5} دقائق\n\n` +
    topics.map((t, i) => `${i + 1}. ${t}`).join('\n'))

  for (let i = 0; i < topics.length; i++) {
    await sendMessage(env, chatId, `\n━━━━━━━━━━━━━━\n📝 <b>${i + 1}/${topics.length}:</b> ${topics[i]}\n━━━━━━━━━━━━━━`)
    await handlePublishFlow(env, chatId, topics[i])
  }

  await sendMessage(env, chatId, `🎉 <b>انتهى!</b> ✅ ${topics.length} مقالات`)
  await notifyAdmin(env, `🚀 طيار آلي: ${topics.length} مقالات`)
}

async function handleNicheSuggestions(env: Env, chatId: number) {
  const msg = `
💡 <b>نيتشات مربحة وسريعة النمو 2026</b>

━━━ 🔥 الأكثر ربحية ━━━

1. 🤖 <b>الذكاء الاصطناعي</b> | 💰 $15-45 | 📈 +340%
2. 💰 <b>التمويل الشخصي</b> | 💰 $25-60 | 📈 +120%
3. 📱 <b>التطبيقات الرقمية</b> | 💰 $18-40 | 📈 +200%
4. 📢 <b>التسويق الرقمي</b> | 💰 $20-50 | 📈 +180%
5. 🎓 <b>التعليم عن بُعد</b> | 💰 $10-30 | 📈 +150%

━━━ 🌟 الأقل منافسة ━━━

6. 🏠 <b>العمل من المنزل</b> | 💰 $12-28
7. 🌿 <b>الحياة المستدامة</b> | 💰 $8-22
8. 🧠 <b>التنمية الذاتية</b> | 💰 $10-25
9. 🍳 <b>الطبخ الصحي</b> | 💰 $8-20
10. ✈️ <b>السفر بميزانية</b> | 💰 $10-30

💡 اختر نيتش تحبه!`

  await sendMessage(env, chatId, msg, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🤖 الذكاء الاصطناعي', callback_data: 'niche_' + encodeURIComponent('الذكاء الاصطناعي') }],
        [{ text: '💰 التمويل الشخصي', callback_data: 'niche_' + encodeURIComponent('التمويل الشخصي') }],
        [{ text: '📱 التطبيقات الرقمية', callback_data: 'niche_' + encodeURIComponent('التطبيقات الرقمية') }],
        [{ text: '📢 التسويق الرقمي', callback_data: 'niche_' + encodeURIComponent('التسويق الرقمي') }],
        [{ text: '🎓 التعليم عن بُعد', callback_data: 'niche_' + encodeURIComponent('التعليم عن بعد') }],
      ]
    }
  })
}

async function handleTemplates(env: Env, chatId: number) {
  await sendMessage(env, chatId, `
📋 <b>قوالب المقالات (12 قالب)</b>

📖 guide - دليل شامل
📝 howto - كيفية
📊 listicle - قائمة مرقمة
⚖️ comparison - مقارنة
⭐ review - مراجعة
💡 tips - نصائح
⚠️ mistakes - أخطاء شائعة
🎓 beginner - دليل مبتدئين
📈 trends - اتجاهات حديثة
📋 case_study - دراسة حالة
🔧 problem_solution - مشكلة/حل
🏆 ultimate - الدليل النهائي`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📖 دليل شامل', callback_data: 'tpl_guide' }, { text: '📝 كيفية', callback_data: 'tpl_howto' }],
        [{ text: '📊 قائمة', callback_data: 'tpl_listicle' }, { text: '⚖️ مقارنة', callback_data: 'tpl_comparison' }],
        [{ text: '⭐ مراجعة', callback_data: 'tpl_review' }, { text: '💡 نصائح', callback_data: 'tpl_tips' }],
        [{ text: '⚠️ أخطاء', callback_data: 'tpl_mistakes' }, { text: '🎓 مبتدئين', callback_data: 'tpl_beginner' }],
        [{ text: '📈 اتجاهات', callback_data: 'tpl_trends' }, { text: '📋 دراسة حالة', callback_data: 'tpl_case_study' }],
        [{ text: '🔧 مشكلة/حل', callback_data: 'tpl_problem_solution' }, { text: '🏆 نهائي', callback_data: 'tpl_ultimate' }],
      ]
    }
  })
}

async function handleScheduleInfo(env: Env, chatId: number) {
  await sendMessage(env, chatId, `
⏰ <b>جدولة النشر</b>

🔧 <b>الطرق المتاحة:</b>

1️⃣ <b>الطيار الآلي (الأسهل):</b>
<code>/autopilot
موضوع 1
موضوع 2
موضوع 3</code>

2️⃣ <b>Cron-job.org (مجاني):</b>
- سجل في cron-job.org
- أضف URL: رابط_بوتك/health
- اضبط التكرار

3️⃣ <b>UptimeRobot (مجاني):</b>
- يراقب البوت ويضمن عدم توقفه

💡 Cloudflare Workers لا ينام أبداً (Serverless)!`)
}

async function handleSettings(env: Env, chatId: number) {
  let geminiKey = null
  let bloggerConfig = null
  if (env.BOT_KV) {
    try {
      geminiKey = await env.BOT_KV.get(`config:${chatId}:gemini_key`)
      bloggerConfig = await env.BOT_KV.get(`config:${chatId}:blogger`)
    } catch {}
  }

  await sendMessage(env, chatId, `
⚙️ <b>الإعدادات</b>

━━━ 🤖 Gemini AI ━━━
الحالة: ${geminiKey ? '✅ مفتاح شخصي' : (env.GEMINI_API_KEY ? '✅ مفتاح عام' : '⚠️ Pollinations (بديل)')}
<code>/setgemini KEY</code>

━━━ 📤 بلوجر ━━━
الحالة: ${bloggerConfig ? '✅ مُعد' : (env.BLOGGER_BLOG_ID ? '✅ عام' : '❌ غير مُعد')}
<code>/setblogger</code> للتعليمات

━━━ 🎨 توليد الصور ━━━
Pollinations AI: ✅ مجاني دائماً

━━━ 🔄 نظام Fallback ━━━
Gemini → Pollinations: ✅ نشط

━━━ 🔑 مفاتيح مجانية ━━━
1️⃣ Gemini: <a href="https://aistudio.google.com/apikey">احصل مجاناً</a>
2️⃣ بلوجر: /setblogger للتعليمات
3️⃣ Pollinations: لا يحتاج مفتاح!`)
}

async function handleFreeChat(env: Env, chatId: number, text: string) {
  const prompt = `أنت مساعد ذكي خبير في التدوين والمحتوى الرقمي وSEO.

${text}

أجب بالعربية بشكل مفيد وموجز وودود.`

  const response = await callGemini(env, prompt, chatId)
  await sendMessage(env, chatId, response)
}

// ============================================================
// 📋 Blogger Setup Guide
// ============================================================
function getBloggerSetupGuide(): string {
  return `
📝 <b>إعداد بلوجر خطوة بخطوة</b>

<b>الخطوة 1: إنشاء مشروع Google Cloud</b>
1. اذهب: <a href="https://console.cloud.google.com">console.cloud.google.com</a>
2. أنشئ مشروع جديد اسمه: <code>blogbot</code>
3. من APIs & Services > Library
4. ابحث عن <b>Blogger API v3</b> وفعّله

<b>الخطوة 2: OAuth Credentials</b>
1. APIs & Services > Credentials
2. Create Credentials > OAuth 2.0 Client ID
3. نوع: Web application
4. Redirect URI: <code>https://developers.google.com/oauthplayground</code>
5. احفظ <b>Client ID</b> و <b>Client Secret</b>

<b>الخطوة 3: Refresh Token</b>
1. اذهب: <a href="https://developers.google.com/oauthplayground">OAuth Playground</a>
2. ⚙️ > Use your own OAuth credentials
3. أدخل Client ID و Secret
4. اختر Blogger API v3 > كل الصلاحيات
5. Authorize > Exchange > انسخ <b>Refresh Token</b>

<b>الخطوة 4: Blog ID</b>
افتح بلوجر > رابط المدونة يحتوي: <code>blogger.com/blog/posts/BLOG_ID</code>

<b>الخطوة 5: أرسل البيانات</b>
<code>/setblogger CLIENT_ID|CLIENT_SECRET|REFRESH_TOKEN|BLOG_ID</code>`
}

// ============================================================
// 🏠 Dashboard HTML
// ============================================================
function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>BlogMaster Pro v5 - بوت إدارة المدونات بالذكاء الاصطناعي</title>
<script src="https://cdn.tailwindcss.com"></script>
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
<style>
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700;800;900&display=swap');
body{font-family:'Tajawal',sans-serif}
.gradient-bg{background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 50%,#312e81 100%)}
.glass{background:rgba(255,255,255,0.08);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,0.15)}
.card:hover{transform:translateY(-8px);box-shadow:0 25px 50px rgba(99,102,241,0.25)}
.glow{box-shadow:0 0 40px rgba(99,102,241,0.3)}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-15px)}}
.float{animation:float 3s ease-in-out infinite}
</style>
</head>
<body class="gradient-bg text-white min-h-screen">

<section class="min-h-screen flex items-center justify-center relative overflow-hidden px-4">
  <div class="absolute inset-0 opacity-20">
    <div class="absolute top-10 right-10 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse"></div>
    <div class="absolute bottom-10 left-10 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" style="animation-delay:1s"></div>
  </div>

  <div class="text-center z-10 max-w-4xl">
    <div class="float mb-8"><div class="w-28 h-28 mx-auto rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center glow"><i class="fas fa-robot text-5xl"></i></div></div>
    <h1 class="text-5xl md:text-7xl font-black mb-4">Blog<span class="text-indigo-400">Master</span> Pro</h1>
    <p class="text-xl md:text-2xl text-white/80 mb-3">v5 - بوت إدارة المدونات بالذكاء الاصطناعي</p>
    <p class="text-lg text-white/60 mb-8 max-w-2xl mx-auto">${AGENTS_COUNT} وكيل AI يعملون معاً: بحث + كتابة + تحرير + SEO + صور + ترجمة + نشر تلقائي</p>

    <div class="glass rounded-2xl p-6 inline-block mb-8">
      <div class="flex gap-8 text-center flex-wrap justify-center">
        <div><p class="text-3xl font-bold text-yellow-300">${AGENTS_COUNT}</p><p class="text-sm text-white/60">وكيل AI</p></div>
        <div><p class="text-3xl font-bold text-green-300">100%</p><p class="text-sm text-white/60">مجاني</p></div>
        <div><p class="text-3xl font-bold text-blue-300">24/7</p><p class="text-sm text-white/60">لا ينام</p></div>
        <div><p class="text-3xl font-bold text-purple-300">12</p><p class="text-sm text-white/60">قالب مقالة</p></div>
      </div>
    </div>

    <div id="status" class="glass rounded-xl p-4 text-sm text-white/50">جاري التحقق من حالة البوت...</div>
  </div>
</section>

<section class="py-20 px-4">
  <div class="max-w-6xl mx-auto">
    <h2 class="text-4xl font-bold text-center mb-16">فريق العمل الذكي</h2>
    <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      ${[
        '🔍|باحث الكلمات|يجد أفضل الكلمات|from-blue-600 to-cyan-500',
        '✍️|كاتب المقالات|يكتب +2000 كلمة|from-green-600 to-emerald-500',
        '✂️|محرر المحتوى|يجعله بشرياً|from-yellow-600 to-amber-500',
        '🔎|خبير SEO|يحسّن للبحث|from-purple-600 to-violet-500',
        '🎨|مصمم الصور|يولّد صور AI|from-pink-600 to-rose-500',
        '📊|محلل المنافسين|يكتشف الفرص|from-cyan-600 to-teal-500',
        '🖥️|مهندس HTML|ينسق احترافياً|from-indigo-600 to-blue-500',
        '📤|ناشر المحتوى|ينشر تلقائياً|from-red-600 to-orange-500',
        '💡|مولّد الأفكار|20 فكرة فوراً|from-amber-600 to-yellow-500',
        '📈|محلل الأداء|يتابع إحصائياتك|from-teal-600 to-green-500',
        '🛡️|مدقق الأصالة|يفحص التفرد|from-slate-600 to-gray-500',
        '🌍|مترجم المحتوى|عربي↔إنجليزي|from-violet-600 to-purple-500'
      ].map(item => {
        const [icon, title, desc, gradient] = item.split('|')
        return `<div class="card glass rounded-2xl p-6 transition-all duration-300">
          <div class="w-14 h-14 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-2xl mb-4">${icon}</div>
          <h3 class="text-lg font-bold mb-2">${title}</h3>
          <p class="text-white/60 text-sm">${desc}</p>
        </div>`
      }).join('')}
    </div>
  </div>
</section>

<footer class="py-8 px-4 text-center text-white/40 border-t border-white/10">
  <p>BlogMaster Pro v5 &copy; 2026 - مدعوم بـ Gemini AI + Cloudflare Workers</p>
  <p class="mt-1 text-sm">مجاني 100% | لا ينام | بدون بطاقة ائتمان</p>
</footer>

<script>
fetch('/api/status').then(r=>r.json()).then(d=>{
  const el=document.getElementById('status');
  el.innerHTML=d.status==='online'?
    '✅ البوت يعمل | الإصدار: '+d.version+' | الوكلاء: '+d.agents:
    '❌ البوت غير متصل';
  el.className=el.className.replace('text-white/50',d.status==='online'?'text-green-400':'text-red-400');
}).catch(()=>{});
</script>
</body>
</html>`
}

export default app
