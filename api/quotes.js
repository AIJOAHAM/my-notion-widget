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

            // 情况 A：如果是文字段落或标题
            if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0) {
                contentData = block.paragraph.rich_text.map(t => t.plain_text).join('');
            } else if (block.type.startsWith('heading_') && block[block.type].rich_text.length > 0) {
                contentData = block[block.type].rich_text.map(t => t.plain_text).join('');
            }
            // 情况 B：如果是直接的图片块
            else if (block.type === 'image') {
                type = "image";
                imageUrl = block.image.type === 'external' 
                    ? block.image.external.url 
                    : block.image.file.url;
            }

            // 【新增核心优化】：如果这个区块本身有子区块（即标题或段落下面嵌套了图片或更多文字），把子区块也抓出来实现“图文混排”
            if (block.has_children) {
                try {
                    const childResponse = await notion.blocks.children.list({ block_id: block.id, page_size: 10 });
                    for (const child of childResponse.results) {
                        if (child.type === 'image') {
                            imageUrl = child.image.type === 'external' ? child.image.external.url : child.image.file.url;
                        } else if (child.type === 'paragraph' && child.paragraph.rich_text.length > 0) {
                            const childText = child.paragraph.rich_text.map(t => t.plain_text).join('');
                            if (contentData) contentData += "\n" + childText;
                            else contentData = childText;
                        }
                    }
                } catch (e) {
                    console.error("获取子区块失败", e);
                }
            }

            // 只要有文字或者有图片，就成功收录
            if (contentData || imageUrl) {
                items.push({
                    id: block.id,
                    type: imageUrl && !contentData ? "image" : (imageUrl ? "mixed" : "text"), // 兼容纯文字、纯图片或图文混合
                    content: contentData || "",
                    image: imageUrl || null,
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
