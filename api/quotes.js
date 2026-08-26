const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const PAGE_ID = process.env.NOTION_PAGE_ID;

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    try {
        const response = await notion.blocks.children.list({ block_id: PAGE_ID });
        let quotes = [];
        const results = response.results || [];
        
        for (let i = 0; i < results.length; i++) {
            const block = results[i];
            let headingText = "";

            // 1. 识别标题（作为 source 出处）
            if (['heading_1', 'heading_2', 'heading_3'].includes(block.type)) {
                const rt = block[block.type].rich_text;
                if (rt && rt.length > 0) headingText = rt.map(t => t.plain_text).join('');
            }

            if (headingText && i + 1 < results.length) {
                let pText = "";
                let imageUrl = null;
                let currentIndex = i + 1;

                // 2. 向后检查：提取紧随其后的段落文本（文案）
                if (currentIndex < results.length && results[currentIndex].type === 'paragraph') {
                    const nextBlock = results[currentIndex];
                    pText = nextBlock.paragraph.rich_text.map(t => t.plain_text).join('');
                    currentIndex++; // 游标往后移
                }

                // 3. 核心新增：检查文案后面（或直接在标题后面）是否紧跟了一张图片截图
                if (currentIndex < results.length && results[currentIndex].type === 'image') {
                    const imgBlock = results[currentIndex];
                    imageUrl = imgBlock.image.type === 'external' 
                        ? imgBlock.image.external.url 
                        : imgBlock.image.file.url;
                }

                // 只要有文字或者有图片，就成功压入数组
                if (pText || imageUrl) {
                    quotes.push({ 
                        text: pText, 
                        image: imageUrl, // 新增：图片链接
                        source: headingText, 
                        id: block.id 
                    });
                }
            }
        }
        res.status(200).json(quotes);
    } catch (error) {
        console.error("Notion API Error:", error);
        res.status(500).json({ error: error.message });
    }
};
