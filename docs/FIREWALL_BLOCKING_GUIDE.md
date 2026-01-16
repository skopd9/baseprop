# 🔒 Firewall Blocking Guide for base-prop.com

## Why Your Website Might Be Blocked

Corporate firewalls block websites for several reasons. Here are the most common causes:

### 1. **Domain Categorization Issues** ⚠️ (Most Common)
- **New or unclassified domains**: If `base-prop.com` is relatively new, it may not be categorized yet in security databases
- **Misclassification**: The domain might be incorrectly categorized as suspicious, gambling, or adult content
- **Lack of reputation**: New domains have no reputation score, so firewalls err on the side of caution

### 2. **SSL/TLS Certificate Concerns**
- **Let's Encrypt certificates**: Some corporate firewalls flag Let's Encrypt certificates (though yours is valid)
- **Certificate chain issues**: Intermediate certificates might not be properly recognized
- **Self-signed or expired certificates**: (Not your case, but common)

### 3. **IP Reputation**
- **Netlify's IP ranges**: The IP addresses that Netlify uses might be flagged
- **Shared hosting concerns**: Some firewalls block shared hosting platforms
- **Geographic location**: If Netlify's servers are in regions flagged by your company

### 4. **Content Filtering**
- **Keywords**: Terms like "property", "tenant", "landlord" might trigger filters
- **JavaScript-heavy sites**: Some firewalls block sites with excessive JavaScript
- **Third-party scripts**: External resources (Supabase, OpenAI) might be flagged

### 5. **Policy Restrictions**
- **Business/Professional tools**: Some companies block business tools not on approved lists
- **Cloud services**: Restrictions on cloud-based applications
- **Data security concerns**: Sites that handle sensitive data (property/tenant info)

---

## 🔧 How to Fix It

### **Option 1: Request IT Whitelist** (Recommended for Employees)

Contact your IT department and request they whitelist the domain:

**Email Template:**
```
Subject: Request to Whitelist Business Application - base-prop.com

Hi IT Team,

I need access to base-prop.com, which is a business application for property 
management that I use for work purposes.

Domain: base-prop.com
Purpose: Property management and real estate operations
SSL Certificate: Valid Let's Encrypt certificate (expires Feb 2026)
Provider: Netlify (reputable hosting platform)

Could you please:
1. Whitelist base-prop.com in the corporate firewall
2. Add www.base-prop.com if needed
3. Whitelist the Netlify CDN if there are CDN-related blocks

Thank you!
```

**Information to Provide IT:**
- Domain: `base-prop.com` and `www.base-prop.com`
- SSL Certificate: Let's Encrypt (valid until Feb 1, 2026)
- Hosting: Netlify
- Purpose: Business application for property management
- IP Addresses: IT can resolve via DNS lookup

---

### **Option 2: Check Firewall Logs**

Ask IT to check firewall logs to see the specific reason:

1. **Check categorization**: What category is the domain classified as?
2. **Check block reason**: What specific rule triggered the block?
3. **Check reputation**: What reputation score does the domain have?

Common categories that cause blocks:
- "Uncategorized" or "Newly Observed"
- "Suspicious" or "Malicious"
- "Business" (sometimes blocked by policy)
- "Cloud Services" (blocked by some policies)

---

### **Option 3: Submit for Re-categorization**

If the domain is misclassified, submit it for re-categorization:

**Services to submit to:**
1. **Bluecoat/Symantec**: https://sitereview.bluecoat.com/
2. **Forcepoint**: https://support.forcepoint.com/
3. **Cisco Umbrella**: https://investigate.umbrella.com/
4. **Webroot**: https://www.webroot.com/us/en/developers/threat-intelligence

**Submission Template:**
```
Category Request: Business/Professional Services
Domain: base-prop.com
Description: Property management platform for real estate operations
Business Purpose: SaaS application for managing rental properties, tenants, 
and property-related workflows
```

---

### **Option 4: Use VPN or Personal Network**

**Short-term workaround:**
- Use a personal device/network (mobile hotspot)
- Use company-approved VPN if available
- Access from personal computer outside company network

**Note**: This is a temporary solution and doesn't address the root cause.

---

### **Option 5: Improve Site Reputation** (Long-term)

We've added security headers to improve the site's reputation. Additional steps:

1. **Ensure consistent HTTPS**: ✅ Already done (Let's Encrypt)
2. **Add security headers**: ✅ Added to netlify.toml
3. **Get business verification**: Submit business details to categorization services
4. **Build domain age**: As the domain ages, it gains reputation
5. **Monitor security**: Keep SSL certificates up to date

---

## 🔍 Diagnostic Steps

### Check Domain Status

**1. Test SSL Certificate:**
```bash
openssl s_client -connect base-prop.com:443 -servername base-prop.com
```

**2. Check DNS:**
```bash
dig base-prop.com
nslookup base-prop.com
```

**3. Test Connectivity:**
```bash
curl -I https://base-prop.com
```

**4. Check Domain Reputation:**
- Visit: https://www.virustotal.com/
- Enter: `base-prop.com`
- Check what security vendors say about it

**5. Check Categorization:**
- Visit: https://sitereview.bluecoat.com/
- Enter: `base-prop.com`
- See current category and reputation

---

## 📋 Quick Checklist for IT Department

When contacting IT, provide:

- [ ] Domain name: `base-prop.com`
- [ ] Alternative domain: `www.base-prop.com`
- [ ] SSL Certificate: Valid Let's Encrypt (expires Feb 2026)
- [ ] Hosting provider: Netlify
- [ ] Business purpose: Property management application
- [ ] Security headers: Configured (see netlify.toml)
- [ ] HTTPS: Enabled and working
- [ ] Certificate transparency: Publicly logged

---

## 🛡️ Security Improvements Made

We've added the following security headers to improve firewall trust:

- **Content-Security-Policy**: Restricts resource loading
- **X-Content-Type-Options**: Prevents MIME sniffing
- **X-Frame-Options**: Prevents clickjacking
- **Strict-Transport-Security**: Enforces HTTPS
- **Referrer-Policy**: Controls referrer information
- **Permissions-Policy**: Restricts browser features

These headers help firewalls recognize the site as legitimate and secure.

---

## ⚡ Quick Fix Summary

**For You (Employee):**
1. Contact IT with the information above
2. Request whitelisting of `base-prop.com`
3. Provide business justification

**For IT (If they ask):**
- Domain is properly secured with valid SSL
- Security headers are configured
- Legitimate business application
- Request categorization review if needed

**Long-term:**
- Domain will gain reputation over time
- Consider submitting to categorization services
- Keep security headers updated

---

## 📞 Need More Help?

If IT needs additional information:
- Check Netlify dashboard for SSL certificate details
- Review security headers in `netlify.toml`
- Check domain status at: https://www.ssllabs.com/ssltest/analyze.html?d=base-prop.com

