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
            let imageUrl = null;
            let type = "text";

            // 1. 获取文字或标题
            if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0) {
                contentData = block.paragraph.rich_text.map(t => t.plain_text).join('');
            } else if (block.type.startsWith('heading_') && block[block.type].rich_text.length > 0) {
                contentData = block[block.type].rich_text.map(t => t.plain_text).join('');
            }
            
            // 2. 获取图片
            else if (block.type === 'image') {
                type = "image";
                imageUrl = block.image.type === 'external' 
                    ? block.image.external.url 
                    : block.image.file.url;
                
                // 如果图片自带 caption（说明文字），也可以顺便当做内容提取
                if (block.image.caption && block.image.caption.length > 0) {
                    contentData = block.image.caption.map(t => t.plain_text).join('');
                }
            }

            if (contentData || imageUrl) {
                items.push({
                    id: block.id,
                    type: imageUrl && !contentData ? "image" : (imageUrl ? "mixed" : "text"),
                    content: contentData || "",
                    image: imageUrl || null,
                    source: "Notion 图文库"
                });
            }
        }

        res.status(200).json(items);
    } catch (error) {
        console.error("Notion API Error:", error);
        res.status(500).json({ error: error.message });
    }
};
