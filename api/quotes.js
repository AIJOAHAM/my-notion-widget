const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const pageId = process.env.NOTION_PAGE_ID;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
        const response = await notion.blocks.children.list({
            block_id: pageId,
            page_size: 100,
        });

        const items = [];
        for (const block of response.results) {
            let contentData = null;
            let type = "text";

            // 情况 A：如果是文字段落或标题
            if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0) {
                contentData = block.paragraph.rich_text.map(t => t.plain_text).join('');
            } else if (block.type.startsWith('heading_') && block[block.type].rich_text.length > 0) {
                contentData = block[block.type].rich_text.map(t => t.plain_text).join('');
            }
            
            // 情况 B：如果是图片块（支持 Notion 内部上传的图片或外链图片）
            else if (block.type === 'image') {
                type = "image";
                contentData = block.image.type === 'external' 
                    ? block.image.external.url 
                    : block.image.file.url; // Notion 官方临时文件链接
            }

            if (contentData) {
                items.push({
                    id: block.id,
                    type: type, // 标记是文字还是图片
                    content: contentData,
                    source: "Notion 图文库"
                });
            }
        }

        res.status(200).json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
