/**
 * EPUB 导出服务
 * 
 * 将小说项目导出为 EPUB 格式的电子书
 */

import type { NovelProject, NovelChapter } from "./enhanced-novel-store";

// ============ 类型定义 ============

export interface EpubOptions {
    includeTableOfContents?: boolean;
    includeCover?: boolean;
    customCss?: string;
    embedFonts?: boolean;
}

// ============ 模板定义 ============

const TEMPLATES = {
    mimetype: "application/epub+zip",

    container: `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`,

    contentOpf: (project: NovelProject, chapters: NovelChapter[]) => `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="BookId">urn:uuid:${project.id}</dc:identifier>
    <dc:title>${escapeXml(project.metadata.title)}</dc:title>
    <dc:creator>${escapeXml(project.metadata.author)}</dc:creator>
    <dc:language>${project.metadata.language}</dc:language>
    <dc:description>${escapeXml(project.metadata.description || "")}</dc:description>
    <meta property="dcterms:modified">${new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}</meta>
  </metadata>
  <manifest>
    <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>
    <item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>
    <item id="style" href="style.css" media-type="text/css"/>
    <item id="title-page" href="title.xhtml" media-type="application/xhtml+xml"/>
${chapters.map((c, i) => `    <item id="chapter-${i + 1}" href="chapter-${i + 1}.xhtml" media-type="application/xhtml+xml"/>`).join("\n")}
  </manifest>
  <spine toc="ncx">
    <itemref idref="title-page"/>
${chapters.map((_, i) => `    <itemref idref="chapter-${i + 1}"/>`).join("\n")}
  </spine>
</package>`,

    tocNcx: (project: NovelProject, chapters: NovelChapter[]) => `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="urn:uuid:${project.id}"/>
    <meta name="dtb:depth" content="1"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle>
    <text>${escapeXml(project.metadata.title)}</text>
  </docTitle>
  <navMap>
    <navPoint id="title" playOrder="1">
      <navLabel><text>封面</text></navLabel>
      <content src="title.xhtml"/>
    </navPoint>
${chapters.map((c, i) => `    <navPoint id="chapter-${i + 1}" playOrder="${i + 2}">
      <navLabel><text>${escapeXml(c.title)}</text></navLabel>
      <content src="chapter-${i + 1}.xhtml"/>
    </navPoint>`).join("\n")}
  </navMap>
</ncx>`,

    nav: (chapters: NovelChapter[]) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops">
<head>
  <title>目录</title>
  <meta charset="UTF-8"/>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <nav epub:type="toc" id="toc">
    <h1>目录</h1>
    <ol>
      <li><a href="title.xhtml">封面</a></li>
${chapters.map((c, i) => `      <li><a href="chapter-${i + 1}.xhtml">${escapeXml(c.title)}</a></li>`).join("\n")}
    </ol>
  </nav>
</body>
</html>`,

    titlePage: (project: NovelProject) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(project.metadata.title)}</title>
  <meta charset="UTF-8"/>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="title-page">
    <h1 class="book-title">${escapeXml(project.metadata.title)}</h1>
    ${project.metadata.subtitle ? `<h2 class="book-subtitle">${escapeXml(project.metadata.subtitle)}</h2>` : ""}
    <p class="book-author">${escapeXml(project.metadata.author)}</p>
    ${project.metadata.description ? `<p class="book-description">${escapeXml(project.metadata.description)}</p>` : ""}
  </div>
</body>
</html>`,

    chapter: (chapter: NovelChapter, index: number) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${escapeXml(chapter.title)}</title>
  <meta charset="UTF-8"/>
  <link rel="stylesheet" type="text/css" href="style.css"/>
</head>
<body>
  <div class="chapter">
    <h1 class="chapter-title">${escapeXml(chapter.title)}</h1>
    <div class="chapter-content">
${markdownToHtml(chapter.content)}
    </div>
  </div>
</body>
</html>`,

    defaultCss: `/* EPUB 默认样式 */

body {
  font-family: "Noto Serif SC", "Source Han Serif SC", "Songti SC", serif;
  line-height: 1.8;
  margin: 1em;
  padding: 0;
  color: #333;
}

/* 标题页 */
.title-page {
  text-align: center;
  padding: 3em 1em;
}

.book-title {
  font-size: 2.5em;
  font-weight: bold;
  margin-bottom: 0.5em;
  color: #222;
}

.book-subtitle {
  font-size: 1.5em;
  font-weight: normal;
  color: #666;
  margin-bottom: 1em;
}

.book-author {
  font-size: 1.2em;
  color: #444;
  margin-top: 2em;
}

.book-description {
  font-size: 1em;
  color: #666;
  margin-top: 2em;
  font-style: italic;
}

/* 目录 */
nav h1 {
  font-size: 1.5em;
  margin-bottom: 1em;
}

nav ol {
  list-style-type: decimal;
  padding-left: 2em;
}

nav li {
  margin: 0.5em 0;
}

nav a {
  color: #333;
  text-decoration: none;
}

nav a:hover {
  text-decoration: underline;
}

/* 章节 */
.chapter {
  margin: 0;
  padding: 1em 0;
}

.chapter-title {
  font-size: 1.8em;
  font-weight: bold;
  text-align: center;
  margin-bottom: 1.5em;
  color: #222;
}

.chapter-content {
  text-indent: 2em;
}

.chapter-content p {
  margin: 0.8em 0;
  text-indent: 2em;
}

.chapter-content p:first-child {
  text-indent: 0;
}

/* 段落间距 */
p {
  margin: 0.8em 0;
}

/* 对话 */
.dialogue {
  margin: 0.5em 0;
}

/* 分隔线 */
hr {
  border: none;
  border-top: 1px solid #ccc;
  margin: 2em auto;
  width: 50%;
}

/* 强调 */
em {
  font-style: italic;
}

strong {
  font-weight: bold;
}
`,
};

// ============ 工具函数 ============

/** XML 转义 */
function escapeXml(text: string): string {
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

/** 简单的 Markdown 转 HTML */
function markdownToHtml(markdown: string): string {
    if (!markdown) return "<p></p>";

    let html = markdown
        // 处理标题（H1-H6）
        .replace(/^###### (.+)$/gm, "<h6>$1</h6>")
        .replace(/^##### (.+)$/gm, "<h5>$1</h5>")
        .replace(/^#### (.+)$/gm, "<h4>$1</h4>")
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        // 处理粗体和斜体
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        // 处理分隔线
        .replace(/^---$/gm, "<hr/>")
        .replace(/^\*\*\*$/gm, "<hr/>")
        // 处理换行
        .split("\n\n")
        .map((para) => {
            para = para.trim();
            if (!para) return "";
            if (para.startsWith("<h") || para.startsWith("<hr")) return para;
            return `<p>${para.replace(/\n/g, "<br/>")}</p>`;
        })
        .filter(Boolean)
        .join("\n");

    return html;
}

/** 创建 ZIP 文件结构 */
interface ZipFile {
    path: string;
    content: string | Uint8Array;
}

// ============ 导出函数 ============

/**
 * 生成 EPUB 文件数据
 * 
 * 返回一个包含所有文件的对象，可以在前端使用 JSZip 打包
 */
export function generateEpubData(
    project: NovelProject,
    options: EpubOptions = {}
): ZipFile[] {
    const chapters = [...project.chapters].sort((a, b) => a.order - b.order);

    const files: ZipFile[] = [
        // mimetype（必须是第一个且不压缩）
        { path: "mimetype", content: TEMPLATES.mimetype },

        // META-INF
        { path: "META-INF/container.xml", content: TEMPLATES.container },

        // OEBPS
        { path: "OEBPS/content.opf", content: TEMPLATES.contentOpf(project, chapters) },
        { path: "OEBPS/toc.ncx", content: TEMPLATES.tocNcx(project, chapters) },
        { path: "OEBPS/nav.xhtml", content: TEMPLATES.nav(chapters) },
        { path: "OEBPS/style.css", content: options.customCss || TEMPLATES.defaultCss },
        { path: "OEBPS/title.xhtml", content: TEMPLATES.titlePage(project) },

        // 章节
        ...chapters.map((chapter, index) => ({
            path: `OEBPS/chapter-${index + 1}.xhtml`,
            content: TEMPLATES.chapter(chapter, index),
        })),
    ];

    return files;
}

/**
 * 导出为 EPUB（在浏览器中下载）
 * 
 * 需要 JSZip 库支持
 */
export async function exportToEpub(
    project: NovelProject,
    options: EpubOptions = {}
): Promise<Blob> {
    // 动态导入 JSZip
    const JSZip = (await import("jszip")).default;

    const zip = new JSZip();
    const files = generateEpubData(project, options);

    // 添加文件到 ZIP
    for (const file of files) {
        if (file.path === "mimetype") {
            // mimetype 必须不压缩
            zip.file(file.path, file.content, { compression: "STORE" });
        } else {
            zip.file(file.path, file.content);
        }
    }

    // 生成 Blob
    const blob = await zip.generateAsync({
        type: "blob",
        mimeType: "application/epub+zip",
        compression: "DEFLATE",
        compressionOptions: { level: 9 },
    });

    return blob;
}

/**
 * 下载 EPUB 文件
 */
export async function downloadEpub(
    project: NovelProject,
    options: EpubOptions = {}
): Promise<void> {
    const blob = await exportToEpub(project, options);

    // 创建下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.metadata.title}.epub`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 获取导出预览信息
 */
export function getExportPreview(project: NovelProject): {
    title: string;
    author: string;
    chapterCount: number;
    totalWords: number;
    estimatedFileSize: string;
} {
    const chapters = project.chapters;
    const totalWords = chapters.reduce((sum, c) => sum + c.wordCount, 0);

    // 估算文件大小（粗略估计：每字约 2-3 字节）
    const estimatedBytes = totalWords * 2.5 + 10000; // 加上模板开销
    let estimatedFileSize: string;

    if (estimatedBytes < 1024) {
        estimatedFileSize = `${estimatedBytes.toFixed(0)} B`;
    } else if (estimatedBytes < 1024 * 1024) {
        estimatedFileSize = `${(estimatedBytes / 1024).toFixed(1)} KB`;
    } else {
        estimatedFileSize = `${(estimatedBytes / (1024 * 1024)).toFixed(1)} MB`;
    }

    return {
        title: project.metadata.title,
        author: project.metadata.author,
        chapterCount: chapters.length,
        totalWords,
        estimatedFileSize,
    };
}

export default {
    generateEpubData,
    exportToEpub,
    downloadEpub,
    getExportPreview,
};
