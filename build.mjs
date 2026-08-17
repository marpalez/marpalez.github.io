// Genera una versión estática por idioma de cada página a partir de src/.
//
//   node build.mjs
//
// Cada página de src/ produce dos ficheros: el inglés en su ruta natural y el
// español bajo /es/. Nunca se editan los ficheros generados: se edita src/ y se
// vuelve a lanzar el build.
//
//   src/index.html                    ->  index.html            +  es/index.html
//   src/projects/appaseo/index.html   ->  projects/appaseo/…    +  es/projects/appaseo/…
//
// El build también reescribe sitemap.xml con las ocho URLs y sus alternates.
//
// CONVENCIONES EN LAS FUENTES
//
//   data-en / data-es                  el atributo del idioma reemplaza el contenido del elemento
//   data-en-content / data-es-content  ídem para el atributo content (meta tags)
//   data-lang="en|es"                  el elemento solo aparece en ese idioma (usado en el JSON-LD;
//                                      válido únicamente en elementos que no se anidan, como <script>)
//   <!--@head-alternates-->            canonical + hreflang + og:url + og:locale
//   <!--@lang-switch-->                enlace a esta misma página en el otro idioma
//
// Las rutas de las fuentes son absolutas desde la raíz (/assets/…, /styles.css).
// Así el mismo HTML sirve a cualquier profundidad y el build solo tiene que
// prefijar /es a los enlaces de navegación.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const ORIGIN = 'https://davidmarpalez.com';
const DEFAULT_LANG = 'en';          // el idioma sin prefijo, y el x-default
const LANGS = ['en', 'es'];

// Rutas de las páginas, sin prefijo de idioma. '/' es la portada.
const PAGES = ['/', '/projects/appaseo/', '/projects/lumenlab/', '/projects/memoryroyale/'];

const OG_LOCALE = { en: 'en_US', es: 'es_ES' };
const SWITCH = {
	en: { label: 'EN', aria: 'View this page in English' },
	es: { label: 'ES', aria: 'Ver esta página en español' },
};

// Ruta pública de una página en un idioma: '/projects/appaseo/' -> '/es/projects/appaseo/'
const urlFor = (page, lang) => (lang === DEFAULT_LANG ? page : `/${lang}${page}`);

// Fichero de salida de una página: '/projects/appaseo/' en es -> 'es/projects/appaseo/index.html'
const fileFor = (page, lang) => join('.', urlFor(page, lang), 'index.html');

// Fichero fuente: '/projects/appaseo/' -> 'src/projects/appaseo/index.html'
const srcFor = page => join('src', page, 'index.html');

function headAlternates(page, lang) {
	const alternates = LANGS.map(
		l => `<link rel="alternate" hreflang="${l}" href="${ORIGIN}${urlFor(page, l)}">`,
	);
	return [
		`<link rel="canonical" href="${ORIGIN}${urlFor(page, lang)}">`,
		...alternates,
		`<link rel="alternate" hreflang="x-default" href="${ORIGIN}${urlFor(page, DEFAULT_LANG)}">`,
		`<meta property="og:url" content="${ORIGIN}${urlFor(page, lang)}">`,
		`<meta property="og:locale" content="${OG_LOCALE[lang]}">`,
		...LANGS.filter(l => l !== lang).map(
			l => `<meta property="og:locale:alternate" content="${OG_LOCALE[l]}">`,
		),
	].join('\n\t');
}

function langSwitch(page, lang) {
	const other = LANGS.find(l => l !== lang);
	const { label, aria } = SWITCH[other];
	return (
		`<a id="boton_idioma" href="${urlFor(page, other)}"` +
		` hreflang="${other}" lang="${other}" aria-label="${aria}">${label}</a>`
	);
}

// Prefija /es a los enlaces de navegación internos. Se prefijan solo los <a> cuyo
// destino empieza por / y no apunta a un fichero (el CV, por ejemplo, es común a
// ambos idiomas y se queda igual). Los assets no van en <a href>, así que no se tocan.
function localiseLinks(html, lang) {
	if (lang === DEFAULT_LANG) return html;
	return html.replace(/(<a\b[^>]*?\bhref=")(\/[^"]*)"/g, (match, head, href) => {
		const path = href.split(/[#?]/)[0];
		if (/\.[a-z0-9]+$/i.test(path)) return match;   // enlace a un fichero
		return `${head}/${lang}${href}"`;
	});
}

function render(page, lang) {
	const other = LANGS.find(l => l !== lang);
	let html = readFileSync(srcFor(page), 'utf8');

	// data-lang="xx": conserva el bloque del idioma actual, elimina el del otro
	html = html.replace(
		new RegExp(`\\s*<(\\w+)\\b[^>]*\\bdata-lang="${other}"[^>]*>[\\s\\S]*?<\\/\\1>`, 'g'),
		'',
	);
	html = html.replace(new RegExp(`\\s+data-lang="${lang}"`, 'g'), '');

	// data-xx-content -> atributo content
	html = html.replace(
		new RegExp(`\\s*data-${lang}-content="([^"]*)"`, 'g'),
		(_, value) => ` content="${value}"`,
	);
	html = html.replace(new RegExp(`\\s*data-${other}-content="[^"]*"`, 'g'), '');

	// data-xx -> contenido del elemento
	html = html.replace(
		new RegExp(`<(\\w+)((?:\\s+[\\w:-]+="[^"]*")*?)\\s+data-${lang}="([^"]*)"((?:\\s+[\\w:-]+="[^"]*")*)\\s*>[\\s\\S]*?<\\/\\1>`, 'g'),
		(_, tag, before, value, after) => `<${tag}${before}${after}>${value}</${tag}>`,
	);
	html = html.replace(new RegExp(`\\s+data-${other}="[^"]*"`, 'g'), '');

	// Antes de inyectar el selector: su enlace ya apunta al otro idioma y no debe prefijarse.
	html = localiseLinks(html, lang);

	html = html
		.replace('<!--@head-alternates-->', headAlternates(page, lang))
		.replace('<!--@lang-switch-->', langSwitch(page, lang))
		.replace(/<html\b[^>]*\blang="[^"]*"/, m => m.replace(/lang="[^"]*"/, `lang="${lang}"`));

	return `<!-- Generado por build.mjs desde ${srcFor(page)} — no editar a mano -->\n${html}`;
}

function sitemap() {
	const entries = PAGES.map(page => {
		const links = [
			...LANGS.map(
				l => `\t\t<xhtml:link rel="alternate" hreflang="${l}" href="${ORIGIN}${urlFor(page, l)}"/>`,
			),
			`\t\t<xhtml:link rel="alternate" hreflang="x-default" href="${ORIGIN}${urlFor(page, DEFAULT_LANG)}"/>`,
		];
		return LANGS.map(lang =>
			[`\t<url>`, `\t\t<loc>${ORIGIN}${urlFor(page, lang)}</loc>`, ...links, `\t</url>`].join('\n'),
		).join('\n');
	});

	return [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
		'\txmlns:xhtml="http://www.w3.org/1999/xhtml">',
		...entries,
		'</urlset>',
		'',
	].join('\n');
}

for (const page of PAGES) {
	for (const lang of LANGS) {
		const out = fileFor(page, lang);
		mkdirSync(dirname(out), { recursive: true });
		writeFileSync(out, render(page, lang), 'utf8');
		console.log(`  ${out}`);
	}
}

writeFileSync('sitemap.xml', sitemap(), 'utf8');
console.log('  sitemap.xml');
