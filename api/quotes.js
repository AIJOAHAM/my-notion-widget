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
            let text = "";
            let imageUrl = null;

            // 提取文字（支持段落、各级标题）
            if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0) {
                text = block.paragraph.rich_text.map(t => t.plain_text).join('');
            } else if (block.type.startsWith('heading_') && block[block.type].rich_text.length > 0) {
                text = block[block.type].rich_text.map(t => t.plain_text).join('');
            }
            
            // 提取图片（同时检查 Notion 图片自带的 caption 作为文字说明）
            else if (block.type === 'image') {
                imageUrl = block.image.type === 'external' 
                    ? block.image.external.url 
                    : block.image.file.url;
                
                if (block.image.caption && block.image.caption.length > 0) {
                    text = block.image.caption.map(t => t.plain_text).join('');
                }
            }

            // 如果有文字或图片，就打包存入列表
            if (text.trim() !== "" || imageUrl) {
                items.push({
                    id: block.id,
                    text: text,
                    image: imageUrl,
                    source: "Notion 笔记"
                });
            }
        }

        res.status(200).json(items);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};
