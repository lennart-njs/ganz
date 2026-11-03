# machs.io website (image version): installation instructions

Version: 29 October 2026
Written in ASD-STE100 (Simplified Technical English).

## 1. Contents of the package

The folder `site/` contains the full website. Upload only this folder.

| File or folder | Function |
| --- | --- |
| `site/index.html` | The start page. All text of the start page is in this file. |
| `site/impressum/index.html` | The legal notice (Impressum). |
| `site/datenschutz/index.html` | The privacy policy (Datenschutzerklärung). |
| `site/404.html` | The page for addresses that do not exist. |
| `site/css/site.css` | All styles. The colors and fonts are variables at the top of the file. |
| `site/js/site.js` | The movement and the controls. The script does not load content from other servers. |
| `site/fonts/` | The font Schibsted Grotesk and its license (`OFL.txt`). |
| `site/favicon.svg`, `site/favicon-32.png`, `site/apple-touch-icon.png` | The icons for the browser and for the home screen. |
| `site/img/reparatur-1280.jpg`, `site/img/reparatur-2560.jpg` | The black-and-white photo in two widths. The browser selects the correct width. |
| `site/img/grain.png` | The film grain on the photo. |
| `site/og.png` | The preview image for links in LinkedIn, messengers and e-mail. |
| `site/robots.txt`, `site/sitemap.xml` | Information for search engines. |
| `site/.htaccess` | The server settings for Apache: HTTPS, security headers, cache, error page. |
| `nginx.conf.example` | The same server settings for nginx. Use it only if your server uses nginx. |

## 2. Before you install

1. Make sure that the domain `machs.io` points to your Hetzner hosting.
2. Make sure that HTTPS works for `machs.io`. The `.htaccess` file sends all visitors to HTTPS.
3. Make a backup of the files that are on the server now.

## 3. Install the website on Hetzner Webhosting (Apache)

1. Open a connection to your webspace with SFTP. Use the access data from konsoleH.
2. Go to the web root folder of `machs.io`. On Hetzner Webhosting, this folder is usually `public_html`.
3. Delete or move the old `index.html` and the old font files.
4. Upload all files and folders from `site/` into the web root folder.
5. Make sure that the file `.htaccess` is on the server. Some SFTP programs hide files that start with a dot.
6. Open `https://machs.io` in a browser.

## 4. Install the website on a server with nginx

Do this procedure only if your server uses nginx and not Apache.

1. Upload all files from `site/` to the web root folder, for example `/var/www/machs.io`.
2. Copy the settings from `nginx.conf.example` into the `server` block for `machs.io`.
3. Do a test of the configuration with the command `nginx -t`.
4. Load the new configuration with the command `systemctl reload nginx`.

Note: nginx ignores the file `.htaccess`. You can delete it on an nginx server.

## 5. Do a check after installation

1. Open `https://machs.io`. Make sure that the headline "Vom Defekt zur passenden Reparatur." shows.
2. Open `https://machs.io/impressum/` and `https://machs.io/datenschutz/`.
3. Open `https://machs.io/test-404`. Make sure that the page "Diese Seite gibt es nicht." shows.
4. Open the start page on a phone. Scroll from the top to the bottom.
5. Open the developer tools of the browser (key F12). Go to the tab "Console". Make sure that there are no red error messages.
6. Go to the tab "Network" and load the page again. Make sure that all requests go to `machs.io` only.
7. Paste the link `https://machs.io` into a LinkedIn post draft. Make sure that the preview image shows. Do not publish the draft.

## 6. Change text

All text is in the HTML files. You do not need a build tool.

1. Open `site/index.html` in a text editor.
2. Find the section with the comments `<!-- ============ ... ============ -->`. Each comment names one part of the page.
3. Change the text between the tags. Do not change the tags and the `class` attributes.
4. Save the file and upload it again.

Each button has two labels. The first label shows at rest. The second label shows when the pointer is on the button:

```html
<span class="lbl"><span>Gespräch anfragen</span><span aria-hidden="true">hallo@machs.io</span></span>
```

Keep the two labels short. The script measures the two labels and changes the button width.

## 7. Change the e-mail address

The address `hallo@machs.io` is in `site/index.html` in many places. Use the function "Find and replace" of your editor.

The legal notice and the privacy policy use `lennart@machs.io`. Change these files only if the legal contact changes.

## 8. Security settings

The file `.htaccess` sets a strict Content Security Policy (CSP). The CSP lets the browser load files from `machs.io` only.

Obey these rules when you change the website:

1. Do not add `style="..."` attributes to the HTML. Use classes in `site/css/site.css`.
2. Do not add `<script>` blocks with code to the HTML. Put the code into `site/js/site.js`.
3. Do not add fonts, images or scripts from other servers.

The start page has one small script in the `<head>`. The CSP permits this script with a hash value. If you change this script, the browser blocks it. Then you must calculate a new hash and put it into the CSP.

## 9. Cache

The browser keeps CSS, JS and font files for one year. The HTML files refer to CSS and JS with a version number, for example `site.css?v=1a2b3c4d`.

If you change `site.css` or `site.js`, change the version number in all HTML files. Use any new value. Then the browser loads the new file.

## 10. Privacy

The website sets no cookies. It has no tracking and no forms. It does not connect to other servers. Thus the current privacy policy stays correct.

The privacy policy names `lennart@machs.io` and the mailbox at united-domains. If `hallo@machs.io` is at a different provider, add this provider to section 6 of the privacy policy.

## 11. Known limits

1. The links with `mailto:` open the e-mail program of the visitor. If the visitor has no e-mail program, nothing happens. For this reason, the address also shows as text with a copy button.
2. The app screens on the start page are examples. The names and the prices are not real. The footer tells this to the visitor.
3. Without JavaScript, the page shows all content without movement. All sections of the list "Was jede Seite davon hat" are open.
4. The setting `Strict-Transport-Security` tells browsers to use only HTTPS for one year. Remove this line if you are not sure that HTTPS will always work.

## 12. The navigation capsule

The black navigation capsule at the top changes when the visitor scrolls:

1. When the visitor scrolls down, the capsule becomes a small round button with the sign „m’“.
2. When the visitor scrolls up, or clicks the small button, the full capsule shows again.
3. After the capsule opens, it stays open until the visitor scrolls down again by approximately 50 pixels.
4. Near the top of the page (less than 120 pixels), the full capsule always shows.

The code is in `site/js/site.js` (section „Navigation: beim Runterscrollen wird die Kapsel zum Zeichen“). The styles are in `site/css/site.css` (classes `.pmark` and `.pill.zeichen`). Do not use the class name `mini` for the capsule: the page uses `.mini` for other elements.

If the visitor selects „reduce motion“ in the operating system, the capsule changes without animation.

## 13. The photo

The image version shows a black-and-white photo with the headline "Gemeinsam machen wir Reparaturen wieder normal." The photo is in the folder `site/img/`.

On wide screens, the headline is in the dark area on the right side of the photo. On phones and tablets in portrait format, the headline is in the lower third. Thus the face and the hands stay free.

To replace the photo, do these steps:

1. Make a black-and-white photo in landscape format with a minimum width of 2560 pixels.
2. Make sure that the right third of the photo is dark and calm. The headline goes there.
3. Save the photo as JPG with the name `reparatur-2560.jpg` and a width of 2560 pixels. Use a JPG quality of 75 to 80.
4. Save a second copy with the name `reparatur-1280.jpg` and a width of 1280 pixels.
5. Replace the two files in `site/img/` and upload them.
6. Open the start page on a computer and on a phone. Make sure that you can read the headline easily.

If the headline covers an important part of the new photo, change the value `padding-left:64vw` in `site/css/site.css`. A larger value moves the headline to the right.

The caption "Symbolbild, mit Bildgenerierung erstellt" shows at the bottom right of the photo. If you use a real photo, change or delete this caption in `site/index.html`.

## 14. The Register version (without photo)

The file `mach_s_Register.html` is the version of the website without the black-and-white photo. It is one file: the styles, the script and the font are inside the file.

The file has the same changes as the image version:

1. The navigation capsule becomes the small button „m’“ when the visitor scrolls down (see section 12).
2. Four explanation sentences are removed: under „Ein Weg in drei Stationen.“, under „Wo Selbsthilfe endet.“, under „Sprechen wir über Ihre Fälle.“ and under „Ein Gerät streikt.“

Do not put this file into the folder `site/` with the file `.htaccess` from this package. The security settings in `.htaccess` (section 8) block styles, scripts and fonts that are inside an HTML file. The page then shows without layout and without movement. To publish the Register version on machs.io, first split it into `index.html`, `css/site.css`, `js/site.js` and the font file, as in the folder `site/`.
