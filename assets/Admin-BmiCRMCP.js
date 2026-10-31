const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/GroupAssignmentTab-DAEc2UES.js","assets/index-2GzdkY74.js","assets/vendor-KB3N6wHM.js","assets/firebase-zlaaY4YN.js","assets/index-B_XgURz1.css","assets/ParticipantDetailsModal-DnmdEyoL.js","assets/layers-DceZVxVr.js","assets/phone-DBt4AZfZ.js","assets/nametagPdfUtils-8v-zc4HI.js","assets/chunkedImageStore-uit-yYJs.js","assets/refresh-cw-EzfB1F8u.js","assets/search-DjqKkh-y.js","assets/download-C5o2uGUI.js","assets/RetreatSelector-QhDW0oDh.js","assets/AutoEmailDispatchTab-3pM-pC2R.js","assets/ApplicantFilterBar-DcF6Qt7F.js","assets/eye-ClqesT46.js","assets/triangle-alert-Dkr_tlHD.js","assets/FlyerTemplateStudioTab-uPcP7qsV.js","assets/graphicExportUtils-BFgpgxVu.js","assets/qr-code-Bf2Whouo.js","assets/NametagTemplateTab-BwCxfvfi.js","assets/CampaignAnalyticsTab-DL62pb8Y.js","assets/DataTab-CDXYePY_.js","assets/exportUtils-bU616o0D.js"])))=>i.map(i=>d[i]);
import{h as R,u as G,j as t,w as _,M as q,m as J,P as ae,o as M,x as ne,f as se,y as W,z as le,i as P,d as C,k as Z,b as Q,X as pe,t as ce,D as de,F as me,H as ge,A as ue,C as he,J as ye,_ as j}from"./index-2GzdkY74.js";import{r as d,L as xe}from"./vendor-KB3N6wHM.js";import{U as Y,T as X,R as fe,a as be}from"./RetreatSelector-QhDW0oDh.js";import{u as Fe,k as L,m as K,l as ve}from"./firebase-zlaaY4YN.js";/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Se=R("BarChart3",[["path",{d:"M3 3v18h18",key:"1s2lah"}],["path",{d:"M18 17V9",key:"2bz60n"}],["path",{d:"M13 17V5",key:"1frdt8"}],["path",{d:"M8 17v-3",key:"17ska0"}]]);/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ke=R("Database",[["ellipse",{cx:"12",cy:"5",rx:"9",ry:"3",key:"msslwz"}],["path",{d:"M3 5V19A9 3 0 0 0 21 19V5",key:"1wlel7"}],["path",{d:"M3 12A9 3 0 0 0 21 12",key:"mv7ke4"}]]);/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const V=R("PenLine",[["path",{d:"M12 20h9",key:"t2du7b"}],["path",{d:"M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z",key:"1ykcvy"}]]);/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const we=R("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]);/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ae=R("Save",[["path",{d:"M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",key:"1c8476"}],["path",{d:"M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7",key:"1ydtos"}],["path",{d:"M7 3v4a1 1 0 0 0 1 1h7",key:"t51u73"}]]);/**
 * @license lucide-react v0.395.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ee=R("Tag",[["path",{d:"M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z",key:"vktsd0"}],["circle",{cx:"7.5",cy:"7.5",r:".5",fill:"currentColor",key:"kqv944"}]]);function Te({setMessage:e}){const{authorizedEmails:r,addVolunteerEmail:o,removeVolunteerEmail:m}=G(),[a,p]=d.useState(""),c=async s=>{if(s.preventDefault(),e({type:"",text:""}),!a.trim()){e({type:"error",text:"Please enter an email address."});return}const g=a.trim().toLowerCase();if(r.includes(g)){e({type:"error",text:`Email ${g} is already authorized.`});return}await o(g)?(e({type:"success",text:`Successfully authorized volunteer: ${g}`}),p("")):e({type:"error",text:"Failed to authorize email."})},u=async s=>{if(s.toLowerCase()===_.toLowerCase()){e({type:"error",text:"Cannot revoke Super Admin privileges."});return}window.confirm(`Are you sure you want to revoke volunteer access for ${s}?`)&&await m(s)&&e({type:"success",text:`Revoked access for ${s}`})};return t.jsxs("div",{className:"animate-fade-in",style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(340px, 1fr))",gap:"2.5rem"},children:[t.jsxs("div",{className:"glass-card",style:{padding:"2rem",background:"#FFFFFF",boxShadow:"var(--shadow-md)"},children:[t.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.75rem",marginBottom:"1.25rem"},children:[t.jsx(Y,{size:22,color:"var(--sky-blue)"}),t.jsx("h2",{style:{fontSize:"1.4rem",fontWeight:700,color:"var(--text-main)"},children:"Authorize New Volunteer"})]}),t.jsx("p",{style:{color:"var(--text-secondary)",fontSize:"0.9rem",lineHeight:1.6,marginBottom:"1.5rem"},children:"Grant volunteer portal access to UIUC chapter members by entering their email below."}),t.jsxs("form",{onSubmit:c,style:{display:"flex",flexDirection:"column",gap:"1rem"},children:[t.jsxs("div",{children:[t.jsx("label",{style:{display:"block",fontSize:"0.8rem",fontWeight:700,color:"var(--text-muted)",marginBottom:"0.35rem"},children:"VOLUNTEER EMAIL ADDRESS"}),t.jsx("input",{type:"email",required:!0,placeholder:"netid@illinois.edu or volunteer@gmail.com",value:a,onChange:s=>p(s.target.value),style:{width:"100%",padding:"0.75rem 1rem",background:"#FFFFFF",border:"1px solid rgba(35, 39, 95, 0.15)",borderRadius:"var(--radius-sm)",color:"var(--text-main)",fontSize:"0.9rem"}})]}),t.jsxs("button",{type:"submit",className:"btn btn-primary",style:{width:"100%",padding:"0.85rem"},children:[t.jsx(Y,{size:16})," Authorize Volunteer Email"]})]})]}),t.jsxs("div",{className:"glass-card",style:{padding:"2rem",background:"#FFFFFF",boxShadow:"var(--shadow-md)"},children:[t.jsxs("h3",{style:{fontSize:"1.2rem",fontWeight:700,marginBottom:"1rem",color:"var(--text-main)"},children:["CURRENT AUTHORIZED VOLUNTEERS (",r.length,")"]}),t.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"0.65rem",maxHeight:"340px",overflowY:"auto"},children:r.map((s,g)=>{const l=s.toLowerCase()===_.toLowerCase();return t.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0.75rem 1rem",background:l?"var(--sky-sun-light)":"#F8FAFC",borderRadius:"var(--radius-sm)",border:l?"1px solid rgba(250, 188, 29, 0.4)":"1px solid var(--border-color)"},children:[t.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.6rem"},children:[t.jsx(q,{size:15,color:l?"#B45309":"var(--text-muted)"}),t.jsx("span",{style:{fontSize:"0.9rem",fontWeight:l?700:500,color:l?"#B45309":"var(--text-main)"},children:s}),l&&t.jsx("span",{className:"badge badge-sun",style:{fontSize:"0.6rem",padding:"0.1rem 0.35rem"},children:"SUPER ADMIN"})]}),!l&&t.jsx("button",{onClick:()=>u(s),style:{background:"none",border:"none",color:"#DC2626",cursor:"pointer",padding:"0.2rem",display:"flex",alignItems:"center"},title:"Revoke Access",children:t.jsx(X,{size:15})})]},g)})})]})]})}const Ce={application_received:{id:"application_received",name:"Application Received",subject:"Application Received - SKY Happiness Retreat",description:"Sent to acknowledge receipt of an application and inform them of officer review.",renderHtml:e=>`
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Application Received - SKY Happiness Retreat</title>
  <style>
    body, p, h1, h2, h3, li, div { color: #23275F; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="background-color: #F7F5F2; margin: 0; padding: 20px; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #23275F;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 30px 30px 25px 30px; border-radius: 8px; border: 2px solid #1F74F1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #23275F;">
    
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #1F74F1; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">SKY Meditation at UIUC</h2>
      <p style="margin: 4px 0 0 0; color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Campus Happiness & Well-being</p>
    </div>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 20px;">

    <h1 style="color: #1F74F1; font-size: 24px; text-align: center; margin-top: 0; margin-bottom: 20px;">Application Received</h1>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">Dear <strong>${e.firstName||"Participant"}</strong>,</p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      Thank you for applying for the <strong>SKY Happiness Retreat at UIUC</strong> on <strong>${e.dates||"the upcoming retreat dates"}</strong>! We are very excited to review your application.
    </p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      Our club officers have begun the review process. We will reach out for a brief confirmation or orientation phone call within the next few days to confirm your details.
    </p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-top: 25px; margin-bottom: 5px; color: #23275F;">
      Warm regards,<br>
      <strong style="color: #23275F;">SKY Meditation at UIUC Team</strong><br>
      <span style="font-size: 14px; color: #718096;">Email: <a href="mailto:${e.clubEmail||"skyatuiuc@gmail.com"}" style="color: #1F74F1;">${e.clubEmail||"skyatuiuc@gmail.com"}</a></span>
    </p>
    
    <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #F7F5F2; font-size: 14px;">
      <a href="https://www.instagram.com/skyatuiuc/" style="color: #1F74F1; text-decoration: none; font-weight: bold;">Follow us on Instagram @skyatuiuc</a>
    </div>

  </div>
</body>
</html>`},application_accepted_standard:{id:"application_accepted_standard",name:"Application Accepted (Fully Funded / $0)",subject:"Application Accepted! - SKY Happiness Retreat",description:"Sent to accepted student applicants with fully funded $0 tuition.",renderHtml:e=>`
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Application Accepted! - SKY Happiness Retreat</title>
  <style>
    body, p, h1, h2, h3, li, div { color: #23275F; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="background-color: #F7F5F2; margin: 0; padding: 20px; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #23275F;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 30px 30px 25px 30px; border-radius: 8px; border: 2px solid #1F74F1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #23275F;">
    
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #1F74F1; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">SKY Meditation at UIUC</h2>
      <p style="margin: 4px 0 0 0; color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Campus Happiness & Well-being</p>
    </div>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 20px;">

    <h1 style="color: #1F74F1; font-size: 24px; text-align: center; margin-top: 0; margin-bottom: 20px;">Application Accepted!</h1>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">Dear <strong>${e.firstName||"Participant"}</strong>,</p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      Thank you for your application to the <strong>SKY Happiness Retreat at UIUC</strong> on <strong>${e.dates||"the upcoming retreat dates"}</strong>. We have reviewed your application and it is our pleasure to inform you that you have been <strong>accepted</strong>! We look forward to having you join us for this transformative retreat.
    </p>
    
    <div style="background-color: #F0F7FF; border-left: 4px solid #1F74F1; padding: 15px 20px; border-radius: 4px; margin: 25px 0;">
      <h3 style="color: #1F74F1; margin-top: 0; margin-bottom: 8px; font-size: 17px;">Next Steps: Official IAHV Registration (Action Required within 24 Hours)</h3>
      <p style="line-height: 1.5; font-size: 15px; margin: 0 0 12px 0; color: #23275F;">
        To secure your spot, please complete the official course registration through our partner organization, the <strong>International Association for Human Values (IAHV)</strong>. If you have a university email, be sure to use your <strong style="color: #1F74F1;">.edu email address</strong> to claim your fully funded tuition waiver.
      </p>
      ${e.registrationLink?`
      <div style="text-align: center; margin-top: 15px;">
        <a href="${e.registrationLink}" style="display: inline-block; background-color: #1F74F1; color: #ffffff !important; padding: 12px 26px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; box-shadow: 0 2px 6px rgba(31, 116, 241, 0.3);">
          Complete Official IAHV Registration Here &rarr;
        </a>
      </div>`:""}
    </div>

    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      In-Person Retreat Schedule & Location
    </h3>
    <ul style="padding-left: 20px; line-height: 1.6; font-size: 15px; color: #23275F;">
      <li style="margin-bottom: 6px; color: #23275F;"><strong style="color: #DB6937;">${e.day1Label||"Friday"}:</strong> ${e.day1Time||"TBA"}</li>
      <li style="margin-bottom: 6px; color: #23275F;"><strong style="color: #DB6937;">${e.day2Label||"Saturday"}:</strong> ${e.day2Time||"TBA"}</li>
      <li style="margin-bottom: 6px; color: #23275F;"><strong style="color: #DB6937;">${e.day3Label||"Sunday"}:</strong> ${e.day3Time||"TBA"}</li>
      <li style="color: #23275F; margin-top: 8px;">
        <strong>Location:</strong> ${e.location||"On campus (UIUC)"}
        ${e.address?`<br><span style="color: #718096; font-size: 14px;"><strong>Address:</strong> ${e.address}</span>`:""}
      </li>
    </ul>

    <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
      <strong style="color: #B45309; font-size: 14px;">Important Commitment Note:</strong>
      <p style="font-size: 14px; line-height: 1.5; color: #92400E; margin: 4px 0 0 0;">
        Space and club funding are limited. Please ensure you are available for <strong>all 3 days</strong>. If your availability changes, kindly email <a href="mailto:${e.clubEmail||"skyatuiuc@gmail.com"}" style="color: #B45309; font-weight: bold;">${e.clubEmail||"skyatuiuc@gmail.com"}</a> immediately so your spot can be offered to another applicant on the waitlist.
      </p>
    </div>

    <p style="line-height: 1.6; font-size: 16px; margin-top: 25px; margin-bottom: 5px; color: #23275F;">
      Looking forward to seeing you soon!<br>
      <strong style="color: #23275F;">SKY Meditation at UIUC</strong>
    </p>
    
    <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #F7F5F2; font-size: 14px;">
      <a href="https://www.instagram.com/skyatuiuc/" style="color: #1F74F1; text-decoration: none; font-weight: bold;">Follow us on Instagram @skyatuiuc</a>
    </div>

  </div>
</body>
</html>`},application_accepted_paypal:{id:"application_accepted_paypal",name:"Application Accepted (With PayPal Payment Link)",subject:"Application Accepted & Payment Instructions - SKY Happiness Retreat",description:"Sent to accepted faculty, staff, postdoc, or non-student applicants requiring payment.",renderHtml:e=>`
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Application Accepted & Payment Instructions - SKY Happiness Retreat</title>
  <style>
    body, p, h1, h2, h3, li, div { color: #23275F; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="background-color: #F7F5F2; margin: 0; padding: 20px; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #23275F;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 30px 30px 25px 30px; border-radius: 8px; border: 2px solid #DB6937; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #23275F;">
    
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #1F74F1; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">SKY Meditation at UIUC</h2>
      <p style="margin: 4px 0 0 0; color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Campus Happiness & Well-being</p>
    </div>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 20px;">

    <h1 style="color: #DB6937; font-size: 24px; text-align: center; margin-top: 0; margin-bottom: 20px;">Application Accepted!</h1>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">Dear <strong>${e.firstName||"Participant"}</strong>,</p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      Thank you for your application to the <strong>SKY Happiness Retreat at UIUC</strong> on <strong>${e.dates||"the upcoming retreat dates"}</strong>. We have reviewed your application and it is our pleasure to inform you that you have been <strong>accepted</strong>!
    </p>
    
    <!-- STEP 1: REGISTRATION -->
    <div style="background-color: #F0F7FF; border-left: 4px solid #1F74F1; padding: 15px 20px; border-radius: 4px; margin: 20px 0;">
      <h3 style="color: #1F74F1; margin-top: 0; margin-bottom: 8px; font-size: 16px;">Step 1: Complete Official IAHV Registration (Within 24h)</h3>
      <p style="line-height: 1.5; font-size: 15px; margin: 0 0 10px 0; color: #23275F;">
        Please complete the official course registration through our partner organization, the <strong>International Association for Human Values (IAHV)</strong>, to secure your spot. Use your university or primary email address.
      </p>
      ${e.registrationLink?`
      <div>
        <a href="${e.registrationLink}" style="display: inline-block; background-color: #1F74F1; color: #ffffff !important; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 14px;">
          Complete Official IAHV Registration &rarr;
        </a>
      </div>`:""}
    </div>

    <!-- STEP 2: PAYPAL PAYMENT -->
    <div style="background-color: #FFF7ED; border-left: 4px solid #DB6937; padding: 15px 20px; border-radius: 4px; margin: 20px 0;">
      <h3 style="color: #DB6937; margin-top: 0; margin-bottom: 8px; font-size: 16px;">Step 2: Complete Course Fee Payment (${e.feeTier||"Partial Funding Fee"})</h3>
      <p style="line-height: 1.5; font-size: 15px; margin: 0 0 10px 0; color: #23275F;">
        As a faculty, staff, postdoc, or non-student participant, this program is partially funded by the club. Please complete your registration payment using your personalized PayPal link below:
      </p>
      ${e.paypalLink?`
      <div>
        <a href="${e.paypalLink}" style="display: inline-block; background-color: #DB6937; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 15px; box-shadow: 0 2px 6px rgba(219, 105, 55, 0.35);">
          Pay via PayPal (${e.feeTier||"Course Fee"}) &rarr;
        </a>
      </div>`:`
      <div style="color: #DC2626; font-size: 14px; font-weight: bold;">
        Payment link pending. Please contact the club at <a href="mailto:${e.clubEmail||"skyatuiuc@gmail.com"}">${e.clubEmail||"skyatuiuc@gmail.com"}</a>.
      </div>`}
    </div>

    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      In-Person Retreat Schedule & Location
    </h3>
    <ul style="padding-left: 20px; line-height: 1.6; font-size: 15px; color: #23275F;">
      <li style="margin-bottom: 6px; color: #23275F;"><strong style="color: #DB6937;">${e.day1Label||"Friday"}:</strong> ${e.day1Time||"TBA"}</li>
      <li style="margin-bottom: 6px; color: #23275F;"><strong style="color: #DB6937;">${e.day2Label||"Saturday"}:</strong> ${e.day2Time||"TBA"}</li>
      <li style="margin-bottom: 6px; color: #23275F;"><strong style="color: #DB6937;">${e.day3Label||"Sunday"}:</strong> ${e.day3Time||"TBA"}</li>
      <li style="color: #23275F; margin-top: 8px;">
        <strong>Location:</strong> ${e.location||"On campus (UIUC)"}
        ${e.address?`<br><span style="color: #718096; font-size: 14px;"><strong>Address:</strong> ${e.address}</span>`:""}
      </li>
    </ul>

    <div style="background-color: #FFFBEB; border: 1px solid #FDE68A; padding: 12px 16px; border-radius: 6px; margin: 20px 0;">
      <strong style="color: #B45309; font-size: 14px;">Important Attendance Note:</strong>
      <p style="font-size: 14px; line-height: 1.5; color: #92400E; margin: 4px 0 0 0;">
        Space is limited. Please ensure you are available for <strong>all 3 days</strong>. If your schedule changes, kindly notify <a href="mailto:${e.clubEmail||"skyatuiuc@gmail.com"}" style="color: #B45309; font-weight: bold;">${e.clubEmail||"skyatuiuc@gmail.com"}</a> promptly.
      </p>
    </div>

    <p style="line-height: 1.6; font-size: 16px; margin-top: 25px; margin-bottom: 5px; color: #23275F;">
      Looking forward to having you join us!<br>
      <strong style="color: #23275F;">SKY Meditation at UIUC</strong>
    </p>
    
    <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #F7F5F2; font-size: 14px;">
      <a href="https://www.instagram.com/skyatuiuc/" style="color: #1F74F1; text-decoration: none; font-weight: bold;">Follow us on Instagram @skyatuiuc</a>
    </div>

  </div>
</body>
</html>`},reminder:{id:"reminder",name:"Registration Reminder",subject:"Action Required: Registration Reminder - SKY Happiness Retreat",description:"Sent to remind accepted applicants to complete their official IAHV registration.",renderHtml:e=>`
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Action Required: Registration Reminder - SKY Happiness Retreat</title>
  <style>
    body, p, h1, h2, h3, li, div { color: #23275F; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="background-color: #F7F5F2; margin: 0; padding: 20px; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #23275F;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 30px 30px 25px 30px; border-radius: 8px; border: 2px solid #1F74F1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #23275F;">
    
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #1F74F1; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">SKY Meditation at UIUC</h2>
      <p style="margin: 4px 0 0 0; color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Campus Happiness & Well-being</p>
    </div>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 20px;">

    <h1 style="color: #1F74F1; font-size: 22px; text-align: center; margin-top: 0; margin-bottom: 20px;">Action Required: Registration Reminder</h1>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">Dear <strong>${e.firstName||"Participant"}</strong>,</p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      This is a quick reminder to complete your official <strong>IAHV course registration</strong> for the upcoming <strong>SKY Happiness Retreat at UIUC</strong> on <strong>${e.dates||"the upcoming retreat dates"}</strong>. Official registration through the IAHV portal is required prior to the retreat to confirm your attendance.
    </p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      Be sure to use your <strong style="color: #1F74F1;">.edu email address</strong> if applicable to avail of club funding.
    </p>
    
    ${e.registrationLink?`
    <div style="text-align: center; margin: 25px 0;">
      <a href="${e.registrationLink}" style="display: inline-block; background-color: #1F74F1; color: #ffffff !important; padding: 12px 26px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 15px; box-shadow: 0 2px 6px rgba(31, 116, 241, 0.3);">
        Complete Official IAHV Registration Here &rarr;
      </a>
    </div>`:""}
    
    <p style="line-height: 1.6; font-size: 15px; color: #4A5568;">
      If you are no longer able to attend, please reply to this email or reach out to <a href="mailto:${e.clubEmail||"skyatuiuc@gmail.com"}" style="color: #1F74F1;">${e.clubEmail||"skyatuiuc@gmail.com"}</a> as soon as possible so your spot can be offered to another applicant.
    </p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-top: 25px; margin-bottom: 5px; color: #23275F;">
      Looking forward to seeing you soon!<br>
      <strong style="color: #23275F;">SKY Meditation at UIUC</strong>
    </p>
    
    <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #F7F5F2; font-size: 14px;">
      <a href="https://www.instagram.com/skyatuiuc/" style="color: #1F74F1; text-decoration: none; font-weight: bold;">Follow us on Instagram @skyatuiuc</a>
    </div>

  </div>
</body>
</html>`},welcome:{id:"welcome",name:"Welcome & Preparation Email",subject:"Welcome to the SKY Happiness Retreat! (Schedule, Location & Details)",description:"Sent 1-2 days before the retreat with location details, parking, what to bring, and schedule.",renderHtml:e=>`
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Welcome to the SKY Happiness Retreat!</title>
  <style>
    body, p, h1, h2, h3, li, div { color: #23275F; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="background-color: #F7F5F2; margin: 0; padding: 20px; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #23275F;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 30px 30px 25px 30px; border-radius: 8px; border: 2px solid #1F74F1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #23275F;">
    
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #1F74F1; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">SKY Meditation at UIUC</h2>
      <p style="margin: 4px 0 0 0; color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Campus Happiness & Well-being</p>
    </div>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 20px;">

    <h1 style="color: #1F74F1; font-size: 24px; text-align: center; margin-top: 0; margin-bottom: 20px;">Welcome to the SKY Happiness Retreat!</h1>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">Dear <strong>${e.firstName||"Participant"}</strong>,</p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      Welcome to the <strong>SKY Happiness Retreat at UIUC</strong> on <strong>${e.dates||"this weekend"}</strong>! Get ready for an incredible and rejuvenating experience.
    </p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 20px; color: #23275F;">
      Please review the following essential information carefully to make the most out of your weekend.
    </p>

    <!-- SCHEDULE -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      Retreat Schedule
    </h3>
    <div style="background-color: #F8FAFC; padding: 15px; border-radius: 6px; margin-bottom: 15px;">
      <p style="margin: 0 0 8px 0; font-size: 15px; color: #23275F;">
        <strong style="color: #DB6937;">${e.day1Label||"Friday"}:</strong> ${e.day1Time||"TBA"}
      </p>
      <ul style="margin: 0 0 12px 0; padding-left: 20px; font-size: 14px; color: #4A5568; line-height: 1.5;">
        <li style="color: #4A5568;">Please arrive <strong>15-20 minutes before</strong> for check-in.</li>
        <li style="color: #4A5568;">Have a light dinner beforehand; light snacks will be provided.</li>
      </ul>
      <p style="margin: 0 0 8px 0; font-size: 15px; color: #23275F;">
        <strong style="color: #DB6937;">${e.day2Label||"Saturday"}:</strong> ${e.day2Time||"TBA"}
      </p>
      <p style="margin: 0 0 8px 0; font-size: 15px; color: #23275F;">
        <strong style="color: #DB6937;">${e.day3Label||"Sunday"}:</strong> ${e.day3Time||"TBA"}
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4A5568; line-height: 1.5;">
        <li style="color: #4A5568;">Please have lunch beforehand (vegetarian meals recommended).</li>
      </ul>
    </div>

    <!-- VENUE & PARKING -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      Venue & Parking
    </h3>
    <p style="line-height: 1.5; font-size: 15px; margin: 8px 0; color: #23275F;">
      <strong>Location:</strong> ${e.location||"On campus (UIUC)"}
      ${e.address?`<br><span style="color: #718096; font-size: 14px;"><strong>Address:</strong> ${e.address}</span>`:""}
    </p>
    <ul style="padding-left: 20px; font-size: 14px; color: #4A5568; line-height: 1.5; margin-bottom: 15px;">
      <li style="color: #4A5568;">Metered street parking is free after 6 PM on weekdays.</li>
      <li style="color: #4A5568;">Campus Lot B1 is free after 6 PM and on weekends.</li>
      <li style="color: #4A5568;"><em>Note: Building doors lock on weekends; a volunteer will be stationed at the entrance to welcome you in.</em></li>
    </ul>

    <!-- PARKING MAP GUIDE -->
    <div style="margin: 16px 0 20px 0; text-align: center;">
      <a href="${e.parkingMapUrl||"https://skyuiuc.org/assets/parking_guide.png"}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block; max-width: 100%;">
        <img 
          src="${e.parkingMapUrl||"https://skyuiuc.org/assets/parking_guide.png"}" 
          alt="UIUC Campus Parking & Venue Guide Map - Lot B1 & Sidney Lu Building" 
          width="540" 
          style="width: 100%; max-width: 540px; height: auto; border-radius: 6px; border: 1.5px solid #CBD5E1; display: block; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" 
        />
      </a>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #718096; font-style: italic;">
        Click map to view full-resolution guide: <a href="${e.parkingMapUrl||"https://skyuiuc.org/assets/parking_guide.png"}" style="color: #1F74F1; text-decoration: underline;">https://skyuiuc.org/assets/parking_guide.png</a>
      </p>
    </div>

    <!-- WHAT TO BRING -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      What to Bring
    </h3>
    <ul style="padding-left: 20px; font-size: 14px; color: #4A5568; line-height: 1.6; margin-bottom: 15px;">
      <li style="color: #4A5568;">Reusable water bottle</li>
      <li style="color: #4A5568;">Your own yoga mat if you have one, we can provide one otherwise</li>
      <li style="color: #4A5568;">Comfortable Clothes</li>
      <li style="color: #4A5568;">A sweater, jacket, or shawl to stay warm during meditations</li>
    </ul>

    <!-- CONTACT -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      On-Site Contact
    </h3>
    <p style="line-height: 1.5; font-size: 14px; color: #4A5568; margin: 8px 0;">
      If you have questions or trouble accessing the building: <br>
      ${e.contactName?`<strong style="color: #23275F;">${e.contactName}:</strong> `:""}${e.contactPhone||""}${e.contactPhone?" | ":""}<a href="mailto:${e.contactEmail||e.clubEmail||"skyatuiuc@gmail.com"}" style="color: #1F74F1;">${e.contactEmail||e.clubEmail||"skyatuiuc@gmail.com"}</a>
    </p>

    <p style="line-height: 1.6; font-size: 16px; margin-top: 25px; margin-bottom: 5px; color: #23275F;">
      We can't wait to host you on Friday!<br>
      <strong style="color: #23275F;">SKY Meditation at UIUC Team</strong>
    </p>
    
    <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #F7F5F2; font-size: 14px;">
      <a href="https://www.instagram.com/skyatuiuc/" style="color: #1F74F1; text-decoration: none; font-weight: bold;">Follow us on Instagram @skyatuiuc</a>
    </div>

  </div>
</body>
</html>`},completion:{id:"completion",name:"Retreat Completion & Follow-Up",subject:"SKY Happiness Retreat | Congratulations and Next Steps!",description:"Sent after retreat completion with cohort group photo, home practice cheat sheet, Sattva app, Sunday reunions, and team info.",renderHtml:e=>`
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="x-apple-disable-message-reformatting">
  <title>Congratulations on completing the SKY Happiness Retreat!</title>
  <style>
    body, p, h1, h2, h3, li, div { color: #23275F; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  </style>
</head>
<body style="background-color: #F7F5F2; margin: 0; padding: 20px; font-family: 'Source Sans 3', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #23275F;">
  <div style="background-color: #ffffff; max-width: 600px; margin: 0 auto; padding: 30px 30px 25px 30px; border-radius: 8px; border: 2px solid #1F74F1; box-shadow: 0 4px 12px rgba(0,0,0,0.05); color: #23275F;">
    
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="margin: 0; color: #1F74F1; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">SKY Meditation at UIUC</h2>
      <p style="margin: 4px 0 0 0; color: #718096; font-size: 13px; text-transform: uppercase; letter-spacing: 1px;">Campus Happiness & Well-being</p>
    </div>

    <hr style="border: none; border-top: 1px solid #E2E8F0; margin-bottom: 20px;">

    <h1 style="color: #1F74F1; font-size: 22px; text-align: center; margin-top: 0; margin-bottom: 20px;">Congratulations on completing the SKY Retreat!</h1>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">Dear <strong>${e.firstName||"Participant"}</strong>,</p>
    
    <p style="line-height: 1.6; font-size: 16px; margin-bottom: 16px; color: #23275F;">
      What an incredible 3 days it's been! We hope the breathwork, meditation, and learnings from this weekend continue to bring peace, focus, and energy into your everyday life.
    </p>

    <!-- COHORT GROUP PICTURE (Optional - displayed if uploaded) -->
    ${e.groupPhotoUrl?`
    <div style="margin: 20px 0 25px 0; text-align: center;">
      <a href="${e.groupPhotoUrl}" target="_blank" style="text-decoration: none; display: block;">
        <img src="${e.groupPhotoUrl}" alt="Retreat Graduation Cohort Group Photo" style="width: 100%; max-width: 540px; height: auto; border-radius: 8px; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(0,0,0,0.08); display: block; margin: 0 auto;" />
      </a>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #718096;">
        <a href="${e.groupPhotoUrl}" target="_blank" style="color: #1F74F1; font-weight: bold; text-decoration: none;">
          Click here to view or download high-resolution group photo &rarr;
        </a>
      </p>
    </div>`:""}

    <!-- HOME PRACTICE -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      SKY Home Practice & Sattva App
    </h3>
    <p style="line-height: 1.6; font-size: 15px; color: #23275F; margin: 8px 0;">
      You can practice daily with the guided audio in the <strong>Sattva Meditation App</strong> (under Meditations &rarr; Advanced &rarr; <em>Daily SKY</em>).
    </p>
    <p style="margin: 10px 0 15px 0;">
      <a href="${e.sattvaLink||"https://www.sattva.life/"}" style="color: #1F74F1; font-weight: bold; text-decoration: none;">Download Sattva App &rarr;</a> (Join our UIUC Circle with code: <strong>KPN8RG</strong>)
    </p>

    <!-- HOME PRACTICE CHEAT SHEET -->
    ${e.cheatSheetUrl?`
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      Home Practice Cheat Sheet
    </h3>
    <p style="line-height: 1.6; font-size: 15px; color: #23275F; margin: 8px 0;">
      Save our cheat sheet for 3-stage pranayama, breath counts, and the daily home practice sequence:
    </p>
    ${/\.(png|jpe?g|webp|gif)$/i.test(e.cheatSheetUrl.split("?")[0])||e.cheatSheetUrl.startsWith("https://lh3.googleusercontent.com/d/")?`
    <div style="margin: 16px 0 20px 0; text-align: center;">
      <a href="${e.cheatSheetUrl}" target="_blank" rel="noopener noreferrer" style="text-decoration: none; display: inline-block; max-width: 100%;">
        <img 
          src="${e.cheatSheetUrl}" 
          alt="SKY Home Practice Cheat Sheet - Sequence and Breath Counts" 
          width="540" 
          style="width: 100%; max-width: 540px; height: auto; border-radius: 6px; border: 1.5px solid #CBD5E1; display: block; margin: 0 auto; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" 
        />
      </a>
      <p style="margin: 8px 0 0 0; font-size: 12px; color: #718096; font-style: italic;">
        Click to view the full-resolution cheat sheet: <a href="${e.cheatSheetUrl}" style="color: #1F74F1; text-decoration: underline;">${e.cheatSheetUrl}</a>
      </p>
    </div>`:`
    <p style="margin: 10px 0 15px 0;">
      <a href="${e.cheatSheetUrl}" target="_blank" rel="noopener noreferrer" style="color: #1F74F1; font-weight: bold; text-decoration: none;">
        View the Home Practice Cheat Sheet &rarr;
      </a>
    </p>`}`:""}

    <!-- WEEKLY REUNIONS -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      Weekly Sunday SKY Reunions
    </h3>
    <p style="line-height: 1.6; font-size: 15px; color: #23275F; margin: 8px 0;">
      Every Sunday, our club meets to practice together, explore ancient wisdom, and grab lunch together!
    </p>
    <ul style="padding-left: 20px; font-size: 14px; color: #4A5568; line-height: 1.5; margin-bottom: 15px;">
      <li style="color: #4A5568;"><strong>When:</strong> Sundays, 11:00 AM - 12:30 PM CST</li>
      <li style="color: #4A5568;"><strong>Where:</strong> Illini Union (Room announced weekly in WhatsApp)</li>
    </ul>

    <!-- STAY CONNECTED -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      Stay Connected on WhatsApp
    </h3>
    <p style="line-height: 1.6; font-size: 15px; color: #23275F; margin: 8px 0 15px 0;">
      Join our WhatsApp community group chat to stay updated on morning Zoom practices, workshops, and social hangouts:
    </p>
    <div style="margin: 15px 0;">
      <a href="${e.whatsAppLink||"#"}" style="display: inline-block; background-color: #25D366; color: #ffffff !important; padding: 10px 22px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">
        Join SKY at UIUC WhatsApp Group &rarr;
      </a>
    </div>

    <!-- GROUP REUNION & GETTING INVOLVED -->
    <h3 style="text-transform: uppercase; letter-spacing: 0.05em; color: #23275F; margin-top: 25px; border-bottom: 2px solid #FABC1D; padding-bottom: 5px; font-size: 16px;">
      Group Reunion & Getting Involved
    </h3>
    <p style="line-height: 1.6; font-size: 15px; color: #23275F; margin: 8px 0 12px 0;">
      We'd love to see everyone together again! Our official <strong>Group Reunion</strong> will take place during our upcoming weekly follow-up session on the <strong>following Sunday</strong>.
    </p>

    <div style="background-color: #F0F7FF; border-left: 4px solid #1F74F1; padding: 14px 18px; border-radius: 4px; margin: 15px 0;">
      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 700; color: #23275F;">
        At the reunion, you can:
      </p>
      <ul style="margin: 0; padding-left: 20px; font-size: 14px; color: #4A5568; line-height: 1.6;">
        <li style="margin-bottom: 5px; color: #4A5568;"><strong>Pick up your goodie bag</strong> (if you missed receiving yours during the retreat)</li>
        <li style="margin-bottom: 5px; color: #4A5568;"><strong>Buy official club merch</strong></li>
        <li style="color: #4A5568;"><strong>Get more information</strong> about joining the team and being part of this exciting club!</li>
      </ul>
    </div>

    <div style="background-color: #FFF7ED; border-left: 4px solid #DB6937; padding: 14px 18px; border-radius: 4px; margin: 15px 0;">
      <p style="margin: 0 0 6px 0; font-size: 14px; font-weight: 700; color: #DB6937;">
        Join Our Volunteer Team!
      </p>
      <p style="line-height: 1.5; font-size: 14px; color: #23275F; margin: 0 0 8px 0;">
        We'd love to invite you to join our volunteer team! If that's something you'd be interested in learning more about, please reach out to us by replying directly to this email or connecting on WhatsApp.
      </p>
      <p style="line-height: 1.4; font-size: 13px; color: #718096; margin: 0; font-style: italic;">
        Note: Formal officer applications will also be opening later in the semester!
      </p>
    </div>

    <p style="line-height: 1.6; font-size: 16px; margin-top: 25px; margin-bottom: 5px; color: #23275F;">
      With love and gratitude,<br>
      <strong style="color: #23275F;">SKY Meditation at UIUC Team</strong>
    </p>
    
    <div style="text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #F7F5F2; font-size: 14px;">
      <a href="https://www.instagram.com/skyatuiuc/" style="color: #1F74F1; text-decoration: none; font-weight: bold;">Follow us on Instagram @skyatuiuc</a>
    </div>

  </div>
</body>
</html>`}},w={},ze=e=>e==null?"":String(e).replace(/[\u2018\u2019]/g,"'").replace(/[\u201C\u201D]/g,'"').replace(/[\u2013\u2014]/g,"-").replace(/\u2026/g,"..."),n=e=>e==null?"":ze(e).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#039;"),T=(e,r="#")=>{if(!e||typeof e!="string")return r;const o=e.trim();return/^(https?:\/\/|mailto:)/i.test(o)?o:o.startsWith("www.")?`https://${o}`:r},O=e=>{if(!e||typeof e!="string")return"";const r=T(e,"");if(!r)return"";const o=r.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i)||r.match(/drive\.google\.com\/(?:uc\?(?:export=view&)?id=|open\?id=)([a-zA-Z0-9_-]+)/i);return o&&o[1]?`https://lh3.googleusercontent.com/d/${o[1]}`:r},ee="https://skyuiuc.org/assets/skyhomepracticecheatsheet.png",te={webhookUrl:"https://script.google.com/macros/s/AKfycbyHJFonGIbqaZfADEed5QgzodmE65hTDLYp_iY-Tn_Nemg9k-eAUQV4s5mYMMRV3zDT/exec",senderEmail:"skyatuiuc@gmail.com",senderName:"SKY Meditation at UIUC",clubEmail:"skyatuiuc@gmail.com",contactName:"",contactPhone:"",contactEmail:"skyatuiuc@gmail.com",sattvaLink:"https://www.sattva.life/",whatsAppLink:(w==null?void 0:w.VITE_WHATSAPP_LINK)||"",surveyLink:(w==null?void 0:w.VITE_SURVEY_LINK)||"",dailyPracticeLink:(w==null?void 0:w.VITE_DAILY_PRACTICE_LINK)||"",defaultRegistrationLink:"https://members.us.iahv.org/us-en/course/checkout",registrationLink:"https://members.us.iahv.org/us-en/course/checkout",cheatSheetUrl:ee},Re=e=>{const r=J(e);return{amount:r.amount,formattedFee:r.formattedFee,isPaid:r.isSettled,requiresPayment:r.status===ae.UNPAID}},je=e=>Re(e).requiresPayment,Ie=(e,r,o,m={})=>{const a={...te,...m};let p=e;const c=je(r);if(e==="application_accepted"||e==="application_accepted_standard"||e==="application_accepted_paypal")if(c){if(!(r.paypalLink||"").trim())throw new Error(`Missing PayPal Invoice Link for ${M(r)}. Please provide a PayPal link on their row before sending.`);p="application_accepted_paypal"}else p="application_accepted_standard";if(p==="welcome"){const b=((o==null?void 0:o.contactName)||a.contactName||"").trim(),f=((o==null?void 0:o.contactPhone)||a.contactPhone||"").trim();if(!b)throw new Error("On-site Contact Name is required to send the Welcome email. Please configure it in Email Settings or on the Retreat.");if(!f)throw new Error("On-site Contact Phone Number is required to send the Welcome email. Please configure it in Email Settings or on the Retreat.")}if(p==="completion"){const b=(a.whatsAppLink||"").trim();if(!b||b.includes("YOUR_WHATSAPP_INVITE_CODE"))throw new Error("WhatsApp Community Invite Link is required to send the Completion email. Please configure it in Email Settings.")}const u=Ce[p];if(!u)throw new Error(`Email template "${e}" not found.`);const s=ne(o),g=s[0]||{fullLabel:"Friday",time:(o==null?void 0:o.fridayTime)||(o==null?void 0:o.day1Time)||""},l=s[1]||{fullLabel:"Saturday",time:(o==null?void 0:o.saturdayTime)||(o==null?void 0:o.day2Time)||""},h=s[2]||{fullLabel:"Sunday",time:(o==null?void 0:o.sundayTime)||(o==null?void 0:o.day3Time)||""},z=o!=null&&o.startDate&&(o!=null&&o.endDate)?`${n(o.startDate)} to ${n(o.endDate)}`:n((o==null?void 0:o.title)||"Upcoming Retreat"),v=T(r.paypalLink),F=v!=="#"?v:"",A={firstName:n(r.firstName||"Participant"),lastName:n(r.lastName||""),name:n(M(r)),email:n(r.email),phone:n(r.phone||""),academicRole:n(r.academicRole||"Participant"),feeTier:n(se(r.academicRole)),paymentStatus:n(J(r).status),paypalLink:F,dates:z,day1Label:n(g.fullLabel),day1Time:n(g.time),day2Label:n(l.fullLabel),day2Time:n(l.time),day3Label:n(h.fullLabel),day3Time:n(h.time),fridayDate:n(g.fullLabel),fridayTime:n(g.time),saturdayDate:n(l.fullLabel),saturdayTime:n(l.time),sundayDate:n(h.fullLabel),sundayTime:n(h.time),weekendDates:`${n(l.fullLabel)} & ${n(h.fullLabel)}`,weekendTime:l.time&&h.time?l.time===h.time?n(l.time):`${n(l.time)} (Sat), ${n(h.time)} (Sun)`:n(l.time||h.time||""),location:n((o==null?void 0:o.location)||""),address:n((o==null?void 0:o.address)||""),fullLocationString:n(o!=null&&o.location?`${o.location}${o.address?` (${o.address})`:""}`:""),parkingMapUrl:T((o==null?void 0:o.parkingMapUrl)||a.parkingMapUrl||"https://skyuiuc.org/assets/parking_guide.png"),teachers:n((o==null?void 0:o.teachers)||"SKY Certified Teachers"),registrationLink:T(a.registrationLink||a.defaultRegistrationLink||(o==null?void 0:o.registrationLink)),clubEmail:n(a.clubEmail||"skyatuiuc@gmail.com"),contactName:n((o==null?void 0:o.contactName)||a.contactName||""),contactPhone:n((o==null?void 0:o.contactPhone)||a.contactPhone||""),contactEmail:n((o==null?void 0:o.contactEmail)||a.contactEmail||"skyatuiuc@gmail.com"),sattvaLink:T(a.sattvaLink),whatsAppLink:T(a.whatsAppLink),surveyLink:T(a.surveyLink),dailyPracticeLink:T(a.dailyPracticeLink),groupPhotoUrl:O((o==null?void 0:o.groupPhotoUrl)||a.groupPhotoUrl),cheatSheetUrl:O(a.cheatSheetUrl)||ee},S=u.renderHtml(A),x=S.replace(/<style[\s\S]*?<\/style>/gi,"").replace(/<head[\s\S]*?<\/head>/gi,"").replace(/<br\s*\/?>/gi,`
`).replace(/<\/p>/gi,`

`).replace(/<\/div>/gi,`
`).replace(/<\/li>/gi,`
`).replace(/<li[^>]*>/gi,"- ").replace(/<hr[^>]*>/gi,`
---
`).replace(/<[^>]+>/g,"").replace(/&rarr;/gi,"->").replace(/&amp;/gi,"&").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&quot;/gi,'"').replace(/&#039;/gi,"'").replace(/&nbsp;/gi," ").replace(/[ \t]+/g," ").replace(/\n\s*\n\s*\n/g,`

`).trim();return{templateKey:p,templateName:u.name,subject:u.subject,recipientEmail:r.email,recipientName:M(r),senderEmail:a.senderEmail||"skyatuiuc@gmail.com",senderName:a.senderName||"SKY Meditation at UIUC",htmlBody:S,plainText:x,isPaying:c,paypalLink:F}},Ue=async(e,r,o,m={})=>{var v,F,A,S;if(!(r!=null&&r.email))throw new Error("Cannot send email: participant has no email address.");const a=Ie(e,r,o,m),c=(v={...te,...m}.webhookUrl)==null?void 0:v.trim();if(!(c&&c.startsWith("https://script.google.com/macros/s/")&&!c.includes("EXAMPLE")))throw new Error("Gmail Webhook URL is not configured yet. Please open 'Email Settings & Links', deploy the Google Apps Script connector under skyatuiuc@gmail.com, and paste your Web App URL.");let s="";if((F=W)!=null&&F.currentUser)try{s=await W.currentUser.getIdToken(!1)}catch(x){console.warn("Could not retrieve fresh Firebase ID token:",x)}let g="";try{const b=await(await fetch(c,{method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"},body:JSON.stringify({action:"send_email",idToken:s,sender:"skyatuiuc@gmail.com",to:a.recipientEmail,toName:a.recipientName,subject:a.subject,htmlBody:a.htmlBody,plainText:a.plainText,templateKey:a.templateKey,participantId:r.id})})).text();let f;try{f=JSON.parse(b)}catch{throw new Error(`Apps Script dispatch failed (Non-JSON response): ${b.slice(0,120)}`)}if(!f||f.status!=="success")throw new Error((f==null?void 0:f.message)||"Apps Script email dispatch rejected.");g=f.dispatchedBy||""}catch(x){throw console.error("Apps Script Webhook request error:",x),new Error(`Failed to dispatch email via Apps Script Webhook: ${x.message}`)}const l={sent:!0,sentAt:new Date().toISOString(),sentBy:g||((S=(A=W)==null?void 0:A.currentUser)==null?void 0:S.email)||"",templateKey:a.templateKey,subject:a.subject,paypalLinkUsed:a.paypalLink||null},h=le(e),z={...r.sentEmails||{},[h]:l};if(r.id&&P&&C)try{await Fe(L(C,"registrations",r.id),{[`sentEmails.${h}`]:l})}catch(x){console.warn("Error saving email status to Firestore:",x)}return{success:!0,subject:a.subject,templateName:a.templateName,payload:a,sentRecord:l,updatedSentEmails:z}},Ve=async(e,r,o,m={},a=null)=>{const p={successes:[],failures:[]};for(let c=0;c<r.length;c++){const u=r[c];a&&a(c+1,r.length,u);try{const s=await Ue(e,u,o,m);p.successes.push({participant:u,result:s})}catch(s){p.failures.push({participant:u,error:s.message})}}return p};function De({setMessage:e}){const{retreats:r}=Z(),[o,m]=d.useState(null),[a,p]=d.useState(""),[c,u]=d.useState(""),[s,g]=d.useState(""),[l,h]=d.useState(""),[z,v]=d.useState("SKY Breath Meditation"),[F,A]=d.useState(""),[S,x]=d.useState(""),[b,f]=d.useState(""),[$,B]=d.useState(""),[N,H]=d.useState(""),[E,D]=d.useState(""),oe=i=>{m(i.id),p(i.title||""),u(i.startDate||""),g(i.endDate||""),h(i.teachers||""),v(i.courses||"SKY Breath Meditation"),A(i.location||""),x(i.address||""),f(i.fridayTime||i.day1Time||""),B(i.saturdayTime||i.day2Time||""),H(i.sundayTime||i.day3Time||""),D(i.groupPhotoUrl||""),e({type:"info",text:`Editing retreat record: ${i.title}`})},I=()=>{m(null),p(""),u(""),g(""),h(""),v("SKY Breath Meditation"),A(""),x(""),f(""),B(""),H(""),D("")},ie=async i=>{if(i.preventDefault(),!a.trim()||!c||!s||!F.trim()){e({type:"error",text:"Please fill in Title, Start Date, End Date, and Location."});return}if(o){const y={...r.find(U=>U.id===o)||{},id:o,title:a.trim(),startDate:c,endDate:s,teachers:l.trim()||"SKY Certified Teachers",courses:z.trim()||"SKY Breath Meditation",location:F.trim(),address:S.trim(),fridayTime:b.trim(),saturdayTime:$.trim(),sundayTime:N.trim(),groupPhotoUrl:E.trim(),updatedAt:new Date().toISOString()};if(P&&C)try{await K(L(C,"retreat_history",o),y,{merge:!0})}catch(U){console.warn("Firestore retreat update error:",U)}I(),e({type:"success",text:`Successfully updated retreat: ${y.title}`})}else{const k=`retreat-${Date.now()}`,y={id:k,title:a.trim(),startDate:c,endDate:s,teachers:l.trim()||"SKY Certified Teachers",courses:z.trim()||"SKY Breath Meditation",location:F.trim(),address:S.trim(),fridayTime:b.trim(),saturdayTime:$.trim(),sundayTime:N.trim(),groupPhotoUrl:E.trim(),createdAt:new Date().toISOString()};if(P&&C)try{await K(L(C,"retreat_history",k),y)}catch(U){console.warn("Firestore retreat save error:",U)}I(),e({type:"success",text:`Successfully created retreat: ${y.title}`})}},re=async(i,k)=>{if(window.confirm(`Delete retreat record "${k}"?`)){if(o===i&&I(),P&&C)try{await ve(L(C,"retreat_history",i))}catch(y){console.warn("Firestore delete retreat error:",y)}e({type:"success",text:"Deleted retreat record."})}};return t.jsxs("div",{className:"animate-fade-in",style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(340px, 1fr))",gap:"2.5rem"},children:[t.jsxs("div",{className:"glass-card",style:{padding:"2rem",background:"#FFFFFF",boxShadow:"var(--shadow-md)"},children:[t.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"1.25rem",flexWrap:"wrap",gap:"0.5rem"},children:[t.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.75rem"},children:[t.jsx(Q,{size:22,color:"var(--sky-blue)"}),t.jsx("h2",{style:{fontSize:"1.4rem",fontWeight:700,margin:0,color:"var(--text-main)"},children:o?"Edit Retreat Record":"Create New Retreat Record"})]}),o&&t.jsxs("span",{className:"badge badge-sun",style:{fontSize:"0.7rem"},children:[t.jsx(V,{size:12,style:{display:"inline",marginRight:"3px"}})," EDITING MODE"]})]}),o&&t.jsxs("div",{style:{padding:"0.75rem 1rem",background:"var(--sky-sun-light)",border:"1px solid rgba(250, 188, 29, 0.3)",borderRadius:"var(--radius-sm)",marginBottom:"1.25rem",fontSize:"0.85rem",color:"var(--text-secondary)",display:"flex",alignItems:"center",justifyContent:"space-between"},children:[t.jsxs("span",{children:["Editing: ",t.jsx("strong",{style:{color:"var(--text-main)"},children:a||"Selected Retreat"})]}),t.jsx("button",{type:"button",onClick:I,style:{background:"none",border:"none",color:"#B45309",cursor:"pointer",fontSize:"0.8rem",fontWeight:600,textDecoration:"underline"},children:"Reset to Create New"})]}),t.jsxs("form",{onSubmit:ie,style:{display:"flex",flexDirection:"column",gap:"1rem"},children:[t.jsxs("div",{children:[t.jsx("label",{style:{display:"block",fontSize:"0.8rem",fontWeight:700,color:"var(--text-muted)",marginBottom:"0.35rem"},children:"RETREAT TITLE *"}),t.jsx("input",{type:"text",required:!0,placeholder:"e.g. SKY Happiness Retreat | Fall 2026",value:a,onChange:i=>p(i.target.value),style:{width:"100%",padding:"0.75rem 1rem",background:"#FFFFFF",border:"1px solid rgba(35, 39, 95, 0.15)",borderRadius:"var(--radius-sm)",color:"var(--text-main)",fontSize:"0.9rem"}})]}),t.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"},children:[t.jsxs("div",{children:[t.jsx("label",{style:{display:"block",fontSize:"0.8rem",fontWeight:700,color:"var(--text-muted)",marginBottom:"0.35rem"},children:"START DATE *"}),t.jsx("input",{type:"date",required:!0,value:c,onChange:i=>u(i.target.value),style:{width:"100%",padding:"0.75rem 1rem",background:"#FFFFFF",border:"1px solid rgba(35, 39, 95, 0.15)",borderRadius:"var(--radius-sm)",color:"var(--text-main)",fontSize:"0.9rem"}})]}),t.jsxs("div",{children:[t.jsx("label",{style:{display:"block",fontSize:"0.8rem",fontWeight:700,color:"var(--text-muted)",marginBottom:"0.35rem"},children:"END DATE *"}),t.jsx("input",{type:"date",required:!0,value:s,onChange:i=>g(i.target.value),style:{width:"100%",padding:"0.75rem 1rem",background:"#FFFFFF",border:"1px solid rgba(35, 39, 95, 0.15)",borderRadius:"var(--radius-sm)",color:"var(--text-main)",fontSize:"0.9rem"}})]})]}),t.jsxs("div",{style:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"1rem"},children:[t.jsxs("div",{children:[t.jsx("label",{style:{display:"block",fontSize:"0.8rem",fontWeight:700,color:"var(--text-muted)",marginBottom:"0.35rem"},children:"TEACHERS / INSTRUCTORS"}),t.jsx("input",{type:"text",placeholder:"Facilitators",value:l,onChange:i=>h(i.target.value),style:{width:"100%",padding:"0.75rem 1rem",background:"#FFFFFF",border:"1px solid rgba(35, 39, 95, 0.15)",borderRadius:"var(--radius-sm)",color:"var(--text-main)",fontSize:"0.9rem"}})]}),t.jsxs("div",{children:[t.jsx("label",{style:{display:"block",fontSize:"0.8rem",fontWeight:700,color:"var(--text-muted)",marginBottom:"0.35rem"},children:"VENUE & ROOM #"}),t.jsx("input",{type:"text",placeholder:"e.g. Sidney Lu Mechanical Engineering Building, Room 2100",value:F,onChange:i=>A(i.target.value),style:{width:"100%",padding:"0.75rem 1rem",background:"#FFFFFF",border:"1px solid rgba(35, 39, 95, 0.15)",borderRadius:"var(--radius-sm)",color:"var(--text-main)",fontSize:"0.9rem"}})]})]}),t.jsxs("div",{children:[t.jsx("label",{style:{display:"block",fontSize:"0.8rem",fontWeight:700,color:"var(--text-muted)",marginBottom:"0.35rem"},children:"STREET ADDRESS (OPTIONAL)"}),t.jsx("input",{type:"text",placeholder:"e.g. 1206 W Green St, Urbana, IL 61801",value:S,onChange:i=>x(i.target.value),style:{width:"100%",padding:"0.75rem 1rem",background:"#FFFFFF",border:"1px solid rgba(35, 39, 95, 0.15)",borderRadius:"var(--radius-sm)",color:"var(--text-main)",fontSize:"0.9rem"}})]}),t.jsxs("div",{children:[t.jsx("label",{style:{display:"block",fontSize:"0.8rem",fontWeight:700,color:"var(--text-muted)",marginBottom:"0.35rem"},children:"COURSE / WORKSHOP TYPE"}),t.jsx("input",{type:"text",placeholder:"e.g. SKY Breath Meditation",value:z,onChange:i=>v(i.target.value),style:{width:"100%",padding:"0.75rem 1rem",background:"#FFFFFF",border:"1px solid rgba(35, 39, 95, 0.15)",borderRadius:"var(--radius-sm)",color:"var(--text-main)",fontSize:"0.9rem"}})]}),t.jsxs("div",{style:{background:"var(--sky-blue-subtle)",padding:"1.25rem",borderRadius:"var(--radius-sm)",border:"1px solid rgba(31, 116, 241, 0.25)",display:"flex",flexDirection:"column",gap:"0.85rem"},children:[t.jsx("div",{style:{fontSize:"0.8rem",fontWeight:700,color:"var(--sky-blue)",textTransform:"uppercase",letterSpacing:"0.05em"},children:"🕒 Daily Session Timings (Used in Cards & Email Templates)"}),t.jsxs("div",{style:{display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(190px, 1fr))",gap:"0.75rem"},children:[t.jsxs("div",{children:[t.jsx("label",{style:{display:"block",fontSize:"0.75rem",fontWeight:700,color:"var(--text-muted)",marginBottom:"0.25rem"},children:"DAY 1 (FRIDAY) TIME"}),t.jsx("input",{type:"text",placeholder:"6:30 PM – 9:30 PM",value:b,onChange:i=>f(i.target.value),style:{width:"100%",padding:"0.65rem 0.85rem",background:"#FFFFFF",border:"1px solid var(--border-color)",borderRadius:"var(--radius-sm)",color:"var(--text-main)",fontSize:"0.85rem"}})]}),t.jsxs("div",{children:[t.jsx("label",{style:{display:"block",fontSize:"0.75rem",fontWeight:700,color:"var(--text-muted)",marginBottom:"0.25rem"},children:"DAY 2 (SATURDAY) TIME"}),t.jsx("input",{type:"text",placeholder:"10:00 AM – 2:00 PM",value:$,onChange:i=>B(i.target.value),style:{width:"100%",padding:"0.65rem 0.85rem",background:"#FFFFFF",border:"1px solid var(--border-color)",borderRadius:"var(--radius-sm)",color:"var(--text-main)",fontSize:"0.85rem"}})]}),t.jsxs("div",{children:[t.jsx("label",{style:{display:"block",fontSize:"0.75rem",fontWeight:700,color:"var(--text-muted)",marginBottom:"0.25rem"},children:"DAY 3 (SUNDAY) TIME"}),t.jsx("input",{type:"text",placeholder:"10:00 AM – 2:00 PM",value:N,onChange:i=>H(i.target.value),style:{width:"100%",padding:"0.65rem 0.85rem",background:"#FFFFFF",border:"1px solid var(--border-color)",borderRadius:"var(--radius-sm)",color:"var(--text-main)",fontSize:"0.85rem"}})]})]})]}),t.jsxs("div",{style:{background:"#F8FAFC",padding:"1.25rem",borderRadius:"var(--radius-sm)",border:"1px solid rgba(35, 39, 95, 0.15)",display:"flex",flexDirection:"column",gap:"0.65rem"},children:[t.jsx("label",{style:{fontSize:"0.8rem",fontWeight:700,color:"var(--text-main)",textTransform:"uppercase",letterSpacing:"0.05em"},children:"📸 Cohort Graduation Group Photo (Included in Completion Email)"}),t.jsxs("p",{style:{fontSize:"0.78rem",color:"var(--text-muted)",margin:0},children:['Paste a shared Google Drive link (set to "Anyone with the link can view"), a website asset link (e.g. ',t.jsx("code",{children:"https://skyuiuc.org/assets/retreats/..."}),"), or any public image URL."]}),t.jsxs("div",{style:{display:"flex",gap:"0.75rem",alignItems:"center"},children:[t.jsx("input",{type:"url",placeholder:"e.g. https://drive.google.com/file/d/... or https://skyuiuc.org/assets/...",value:E,onChange:i=>D(O(i.target.value)),style:{flex:1,padding:"0.65rem 0.85rem",background:"#FFFFFF",border:"1px solid var(--border-color)",borderRadius:"var(--radius-sm)",color:"var(--text-main)",fontSize:"0.85rem"}}),E&&t.jsx("button",{type:"button",onClick:()=>D(""),style:{padding:"0.65rem 0.85rem",background:"#FEE2E2",color:"#DC2626",border:"1px solid #FCA5A5",borderRadius:"var(--radius-sm)",fontSize:"0.82rem",fontWeight:700,cursor:"pointer"},children:"Remove"})]}),E&&t.jsxs("div",{style:{marginTop:"0.35rem",display:"flex",alignItems:"center",gap:"1rem",background:"#FFFFFF",padding:"0.5rem",borderRadius:"4px",border:"1px solid var(--border-color)"},children:[t.jsx("img",{src:E,alt:"Group Photo Preview",style:{width:"80px",height:"55px",objectFit:"cover",borderRadius:"4px",border:"1px solid #E2E8F0"},onError:i=>{i.target.style.display="none"}}),t.jsxs("div",{style:{fontSize:"0.78rem",color:"var(--text-muted)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1},children:[t.jsx("span",{style:{color:"#16A34A",fontWeight:700},children:"✓ Attached: "}),t.jsx("a",{href:E,target:"_blank",rel:"noreferrer",style:{color:"var(--sky-blue)"},children:E})]})]})]}),o?t.jsxs("div",{style:{display:"flex",gap:"1rem",marginTop:"0.5rem"},children:[t.jsxs("button",{type:"button",onClick:I,className:"btn btn-secondary",style:{flex:1,padding:"0.85rem",gap:"0.4rem"},children:[t.jsx(pe,{size:16})," Cancel"]}),t.jsxs("button",{type:"submit",className:"btn btn-sun",style:{flex:2,padding:"0.85rem",gap:"0.4rem"},children:[t.jsx(Ae,{size:16})," Save Changes"]})]}):t.jsxs("button",{type:"submit",className:"btn btn-sun",style:{width:"100%",padding:"0.85rem",marginTop:"0.5rem"},children:[t.jsx(we,{size:16})," Create Retreat Record"]})]})]}),t.jsxs("div",{className:"glass-card",style:{padding:"2rem",background:"#FFFFFF",boxShadow:"var(--shadow-md)"},children:[t.jsxs("h3",{style:{fontSize:"1.2rem",fontWeight:700,marginBottom:"1rem",color:"var(--text-main)"},children:["MANAGED RETREAT RECORDS (",r.length,")"]}),t.jsx("div",{style:{display:"flex",flexDirection:"column",gap:"0.75rem",maxHeight:"480px",overflowY:"auto"},children:r.length===0?t.jsx("div",{style:{color:"var(--text-muted)",textAlign:"center",padding:"2.5rem 1rem"},children:"No retreat records found. Use the form to create your first retreat."}):r.map(i=>{const k=i.endDate>=ce(),y=o===i.id;return t.jsxs("div",{style:{padding:"1rem 1.15rem",background:y?"var(--sky-sun-light)":"#F8FAFC",borderRadius:"var(--radius-sm)",border:y?"1px solid var(--sky-sun)":k?"1px solid var(--sky-blue)":"1px solid var(--border-color)",display:"flex",alignItems:"center",justifyContent:"space-between",gap:"1rem",transition:"var(--transition-fast)"},children:[t.jsxs("div",{style:{minWidth:0,flex:1},children:[t.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.5rem",marginBottom:"0.25rem",flexWrap:"wrap"},children:[t.jsx("span",{style:{fontWeight:700,fontSize:"0.95rem",color:"var(--text-main)"},children:i.title}),t.jsx("span",{className:`badge ${k?"badge-sky":"badge-earth"}`,style:{fontSize:"0.65rem"},children:k?"UPCOMING":"PAST"}),i.groupPhotoUrl&&t.jsx("span",{className:"badge badge-sky",style:{fontSize:"0.65rem"},children:"📸 PHOTO"}),y&&t.jsx("span",{className:"badge badge-sun",style:{fontSize:"0.65rem"},children:"EDITING"})]}),t.jsxs("div",{style:{fontSize:"0.8rem",color:"var(--text-muted)",display:"flex",alignItems:"center",gap:"0.5rem",flexWrap:"wrap"},children:[t.jsxs("span",{children:["📅 ",i.startDate," to ",i.endDate]}),t.jsx("span",{children:"•"}),t.jsxs("span",{children:["📍 ",i.location||"UIUC Campus",i.address?` (${i.address})`:""]})]}),i.teachers&&t.jsxs("div",{style:{fontSize:"0.75rem",color:"var(--text-secondary)",marginTop:"0.25rem"},children:["Instructors: ",i.teachers]})]}),t.jsxs("div",{style:{display:"flex",alignItems:"center",gap:"0.4rem",flexShrink:0},children:[t.jsxs("button",{onClick:()=>oe(i),style:{background:y?"var(--sky-sun-light)":"#FFFFFF",border:y?"1px solid var(--sky-sun)":"1px solid var(--border-color)",borderRadius:"var(--radius-sm)",color:y?"#B45309":"var(--text-main)",cursor:"pointer",padding:"0.35rem 0.65rem",display:"flex",alignItems:"center",gap:"0.3rem",fontSize:"0.75rem",fontWeight:600,transition:"var(--transition-fast)"},title:"Edit Retreat Data",children:[t.jsx(V,{size:13})," Edit"]}),t.jsx("button",{onClick:()=>re(i.id,i.title),style:{background:"#FEF2F2",border:"1px solid #F87171",borderRadius:"var(--radius-sm)",color:"#DC2626",cursor:"pointer",padding:"0.35rem 0.5rem",display:"flex",alignItems:"center",justifyContent:"center",transition:"var(--transition-fast)"},title:"Delete Retreat",children:t.jsx(X,{size:15})})]})]},i.id)})})]})]})}const Pe=d.lazy(()=>j(()=>import("./GroupAssignmentTab-DAEc2UES.js"),__vite__mapDeps([0,1,2,3,4,5,6,7,8,9,10,11,12,13]))),Le=d.lazy(()=>j(()=>import("./AutoEmailDispatchTab-3pM-pC2R.js"),__vite__mapDeps([14,1,2,3,4,15,11,7,16,5,6,17,10,13]))),$e=d.lazy(()=>j(()=>import("./FlyerTemplateStudioTab-uPcP7qsV.js"),__vite__mapDeps([18,1,2,3,4,19,9,20,13]))),Be=d.lazy(()=>j(()=>import("./NametagTemplateTab-BwCxfvfi.js"),__vite__mapDeps([21,1,2,3,4,8,9,10,6,16,13]))),Ne=d.lazy(()=>j(()=>import("./CampaignAnalyticsTab-DL62pb8Y.js"),__vite__mapDeps([22,1,2,3,4,20,13]))),He=d.lazy(()=>j(()=>import("./DataTab-CDXYePY_.js"),__vite__mapDeps([23,1,2,3,4,24,17,10,12,13]))),Me=()=>t.jsx("div",{style:{padding:"3rem",textAlign:"center",color:"var(--text-muted)",fontWeight:600},children:"Loading…"});function We(){const{currentUser:e,authorizedEmails:r}=G(),{retreats:o}=Z(),[m,a]=d.useState("volunteers"),[p,c]=d.useState({type:"",text:""}),u=[{id:"volunteers",label:`Volunteer Access (${r.length})`,Icon:Y},{id:"retreats",label:`Retreat Management (${o.length})`,Icon:Q,accent:"var(--sky-sun)",color:"#B45309"},{id:"groups",label:"Group Assignments",Icon:de},{id:"emails",label:"Auto Email Dispatch",Icon:q},{id:"flyer_templates",label:"Flyer Templates",Icon:me,accent:"var(--illini-orange)",color:"#C2410C"},{id:"nametag_templates",label:"Nametag Templates",Icon:Ee,accent:"#0284C7",color:"#0284C7"},{id:"campaign_analytics",label:"Campaign Scan Analytics",Icon:Se,accent:"var(--sky-sun)",color:"#B45309"},{id:"data",label:"Data, Usage & Backups",Icon:ke,accent:"#10B981",color:"#166534"}];return t.jsx("div",{style:{padding:"3.5rem 0 6rem 0"},children:t.jsxs("div",{className:"container",children:[t.jsxs("div",{style:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"2rem",flexWrap:"wrap",gap:"1rem"},children:[t.jsxs("div",{children:[t.jsx("h1",{style:{fontSize:"clamp(1.5rem, 3.5vw, 2.2rem)",fontWeight:800,lineHeight:1.25,color:"var(--text-main)"},children:"UIUC Campus Administration & Monitoring"}),t.jsxs("p",{style:{color:"var(--text-secondary)",fontSize:"0.92rem",marginTop:"0.25rem"},children:["Authenticated Super Admin: ",t.jsx("strong",{style:{color:"var(--sky-blue)"},children:e==null?void 0:e.email})]})]}),t.jsxs(xe,{to:"/volunteer",className:"btn btn-primary",style:{padding:"0.8rem 1.35rem",whiteSpace:"nowrap"},children:[t.jsx(ge,{size:18})," Open Volunteer Portal ",t.jsx(ue,{size:16})]})]}),p.text&&t.jsxs("div",{style:{background:p.type==="success"?"#DCFCE7":"#FEF2F2",border:`1px solid ${p.type==="success"?"#86EFAC":"#F87171"}`,color:p.type==="success"?"#166534":"#DC2626",padding:"1rem 1.25rem",borderRadius:"var(--radius-md)",marginBottom:"2rem",display:"flex",alignItems:"center",gap:"0.75rem"},children:[p.type==="success"?t.jsx(he,{size:20}):t.jsx(ye,{size:20}),t.jsx("span",{style:{fontWeight:600},children:p.text})]}),t.jsx(fe,{}),t.jsx(be,{tabs:u,activeTab:m,onChange:a}),m==="volunteers"&&t.jsx(Te,{setMessage:c}),m==="retreats"&&t.jsx(De,{setMessage:c}),t.jsxs(d.Suspense,{fallback:t.jsx(Me,{}),children:[m==="groups"&&t.jsx(Pe,{}),m==="emails"&&t.jsx(Le,{}),m==="flyer_templates"&&t.jsx($e,{setMessage:c}),m==="nametag_templates"&&t.jsx(Be,{}),m==="campaign_analytics"&&t.jsx(Ne,{}),m==="data"&&t.jsx(He,{})]})]})})}const Ge=Object.freeze(Object.defineProperty({__proto__:null,default:We},Symbol.toStringTag,{value:"Module"}));export{Ge as A,Se as B,te as D,Ce as E,we as P,Ae as S,Ee as T,ee as a,je as b,Ie as c,Ve as d,V as e,ke as f,Re as p,Ue as s};
