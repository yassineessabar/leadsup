# Complete i18n Implementation Guide for LeadsUp

## 🚀 Quick Start

The i18n setup is now complete! Here's how to use it throughout your app:

## 📁 File Structure

```
/public/locales/
├── en/
│   ├── translation.json    # Main translations
│   └── common.json         # Common/shared translations
└── fr/
    ├── translation.json    # French translations
    └── common.json         # French common translations

/lib/
└── i18n.js                # i18n configuration

/components/
├── i18n-provider.tsx      # i18n provider wrapper
├── language-selector.tsx  # Language selector components
└── dashboard-header-i18n.tsx # Example i18n component

/hooks/
└── use-i18n.tsx          # Custom i18n hook
```

## 🔧 How to Use i18n in Your Components

### 1. Basic Usage in Components

```tsx
// Import the translation hook
import { useTranslation } from 'react-i18next'

export function MyComponent() {
  const { t } = useTranslation()
  
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <button>{t('button.save')}</button>
    </div>
  )
}
```

### 2. Using with Dynamic Values (Interpolation)

```tsx
const { t } = useTranslation()
const userName = "John"

return <h1>{t('welcome', { name: userName })}</h1>
// Output: "Welcome John" or "Bienvenue John"
```

### 3. Using the Trans Component for Rich Text

```tsx
import { Trans } from 'react-i18next'

return (
  <Trans i18nKey="termsText">
    By clicking continue, you agree to our <strong>Terms of Service</strong>
  </Trans>
)
```

### 4. Using Custom Hook

```tsx
import { useI18n } from '@/hooks/use-i18n'

export function MyComponent() {
  const { t, currentLanguage, changeLanguage } = useI18n()
  
  return (
    <div>
      <p>Current language: {currentLanguage}</p>
      <button onClick={() => changeLanguage('fr')}>
        Switch to French
      </button>
    </div>
  )
}
```

## 🔄 Converting Existing Components

### Step 1: Make Component Client-Side
Add `"use client"` at the top if not already present.

### Step 2: Import useTranslation
```tsx
import { useTranslation } from 'react-i18next'
```

### Step 3: Initialize the Hook
```tsx
const { t } = useTranslation()
```

### Step 4: Replace Hard-coded Text
```tsx
// Before:
<h1>Dashboard</h1>

// After:
<h1>{t('dashboard.title')}</h1>
```

### Example: Converting Your Login Page

```tsx
// Before:
<h1>Welcome Back</h1>
<button>Log In</button>

// After:
<h1>{t('greeting')}</h1>
<button>{t('auth.login')}</button>
```

## 🌐 Language Selector Integration

### Option 1: In Header/Navigation
```tsx
import { LanguageSelector } from '@/components/language-selector'

<header>
  <nav>...</nav>
  <LanguageSelector />
</header>
```

### Option 2: Compact Version
```tsx
import { LanguageSelectorCompact } from '@/components/language-selector'

<div className="toolbar">
  <LanguageSelectorCompact />
</div>
```

### Option 3: In Settings Page
```tsx
import { LanguageButtons } from '@/components/language-selector'

<div className="settings-section">
  <LanguageButtons />
</div>
```

## 📝 Adding New Translations

### 1. Add to English File
`/public/locales/en/translation.json`:
```json
{
  "newFeature": {
    "title": "New Feature",
    "description": "This is a new feature"
  }
}
```

### 2. Add to French File
`/public/locales/fr/translation.json`:
```json
{
  "newFeature": {
    "title": "Nouvelle Fonctionnalité",
    "description": "Ceci est une nouvelle fonctionnalité"
  }
}
```

### 3. Use in Component
```tsx
const { t } = useTranslation()
return <h1>{t('newFeature.title')}</h1>
```

## 🎯 Best Practices

### 1. Organize Translations by Feature
```json
{
  "campaigns": {
    "title": "Campaigns",
    "create": "Create Campaign",
    "edit": "Edit Campaign"
  },
  "leads": {
    "title": "Leads",
    "import": "Import Leads"
  }
}
```

### 2. Use Namespaces for Large Apps
Create separate JSON files for different sections:
- `/locales/en/dashboard.json`
- `/locales/en/campaigns.json`
- `/locales/en/settings.json`

### 3. Handle Missing Translations
```tsx
// Provide fallback text
{t('some.key', 'Fallback text if translation missing')}
```

### 4. Format Dates and Numbers
```tsx
const { t, i18n } = useTranslation()

// Format date according to locale
const formattedDate = new Date().toLocaleDateString(i18n.language)

// Format numbers
const formattedNumber = (1234.56).toLocaleString(i18n.language)
```

## 🔍 Components to Update

Here are the main components that need i18n integration:

### Authentication Pages
- [x] `/app/auth/login/page.tsx` → Example created as `page-i18n.tsx`
- [ ] `/app/auth/signup/page.tsx`
- [ ] `/app/auth/forgot-password/page.tsx`
- [ ] `/app/auth/reset-password/page.tsx`

### Dashboard Components
- [x] `/components/dashboard-header.tsx` → Example created as `dashboard-header-i18n.tsx`
- [ ] `/components/dashboard-sidebar.tsx`
- [ ] `/components/comprehensive-dashboard.tsx`
- [ ] `/components/leads-dashboard.tsx`

### Main Features
- [ ] `/components/campaign-tab.tsx`
- [ ] `/components/leads-tab.tsx`
- [ ] `/components/inbox-tab.tsx`
- [ ] `/components/domain-tab.tsx`
- [ ] `/components/templates-tab.tsx`
- [ ] `/components/integrations-tab.tsx`

### Settings & Account
- [ ] `/components/account-tab.tsx`
- [ ] `/components/settings-page.tsx`
- [ ] `/components/billing-subscription-page.tsx`
- [ ] `/components/upgrade-page.tsx`

## 🚀 Quick Implementation Steps

1. **Add Language Selector to Your App**
   - Add to dashboard header or navigation
   - Users can switch between EN/FR instantly

2. **Convert High-Priority Pages First**
   - Login/Signup pages
   - Dashboard
   - Main navigation

3. **Gradually Convert Features**
   - Start with static text
   - Then dynamic content
   - Finally, error messages and notifications

4. **Test Both Languages**
   - Switch between EN/FR
   - Check for text overflow
   - Verify all translations work

## 🎨 RTL Support (Future)

The setup is ready for RTL languages. When adding Arabic or Hebrew:

1. Add language to `i18n.js`:
```js
supportedLngs: ['en', 'fr', 'ar', 'he']
```

2. Add RTL detection:
```tsx
const { i18n } = useTranslation()
const isRTL = ['ar', 'he'].includes(i18n.language)

<div dir={isRTL ? 'rtl' : 'ltr'}>
  {/* Your content */}
</div>
```

## 📊 Translation Coverage Script

To find untranslated text in your components:

```bash
# Search for hardcoded strings (basic check)
grep -r ">[^<]*[A-Za-z][^<]*<" --include="*.tsx" --include="*.jsx" components/
```

## 🤝 Adding More Languages

1. Create new locale folder: `/public/locales/[lang]/`
2. Copy English files and translate
3. Add to `i18n.js` configuration:
```js
supportedLngs: ['en', 'fr', 'es', 'de', 'pt']
```
4. Add to language selector component

## 💡 Tips

- Keep translation keys short but descriptive
- Use nested objects for organization
- Always provide fallback text
- Test with longer text (French is ~30% longer than English)
- Consider pluralization rules for different languages
- Use translation management tools for larger teams

## 🐛 Troubleshooting

### Translations Not Loading
- Check browser console for 404 errors
- Verify JSON files are in `/public/locales/`
- Check for JSON syntax errors

### Language Not Persisting
- Check localStorage for `i18nextLng` key
- Verify cookies are enabled

### Component Not Updating
- Ensure component is wrapped in `I18nProvider`
- Component must be client-side (`"use client"`)

## 📚 Resources

- [react-i18next documentation](https://react.i18next.com/)
- [i18next documentation](https://www.i18next.com/)
- [Next.js i18n guide](https://nextjs.org/docs/app/building-your-application/routing/internationalization)

---

## Next Steps

1. Review the example components (`page-i18n.tsx` and `dashboard-header-i18n.tsx`)
2. Start by adding the LanguageSelector to your main layout
3. Convert your most important pages first
4. Gradually translate the rest of your app
5. Get translations reviewed by native French speakers

The foundation is ready - you can now internationalize your entire app! 🌍