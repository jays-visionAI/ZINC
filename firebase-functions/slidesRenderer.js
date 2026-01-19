/**
 * Slides Renderer Module
 * PRD v13 - Knowledge Hub's Content Plan: Create (One-Pager, Editable)
 * 
 * Handles Google Slides presentation generation from templates
 * using semantic specifications from LLM.
 */

const { google } = require('googleapis');

/**
 * SlidesRenderer class
 * Creates and customizes Google Slides presentations from templates
 */
class SlidesRenderer {
    constructor() {
        // Use default Cloud Functions authentication
        this.auth = new google.auth.GoogleAuth({
            scopes: [
                'https://www.googleapis.com/auth/presentations',
                'https://www.googleapis.com/auth/drive',
                'https://www.googleapis.com/auth/drive.file'
            ]
        });

        this.slides = null;
        this.drive = null;
        this.initialized = false;
    }

    /**
     * Initialize the API clients
     */
    async init() {
        if (this.initialized) return;

        const authClient = await this.auth.getClient();
        this.slides = google.slides({ version: 'v1', auth: authClient });
        this.drive = google.drive({ version: 'v3', auth: authClient });
        this.initialized = true;

        console.log('[SlidesRenderer] Initialized with default Cloud Functions auth');
    }

    // Shared Drive ID for storing generated presentations
    static SHARED_DRIVE_ID = '0APKg-uH5OyVzUk9PVA';

    /**
     * Copy a template presentation
     * @param {string} templateId - Google Slides template ID
     * @param {string} title - New presentation title
     * @returns {Promise<string>} - New presentation ID
     */
    async copyTemplate(templateId, title) {
        await this.init();

        console.log(`[SlidesRenderer] Copying template ${templateId} as "${title}"`);
        console.log(`[SlidesRenderer] Target Shared Drive: ${SlidesRenderer.SHARED_DRIVE_ID}`);

        const response = await this.drive.files.copy({
            fileId: templateId,
            supportsAllDrives: true,
            requestBody: {
                name: title,
                parents: [SlidesRenderer.SHARED_DRIVE_ID]
            }
        });

        console.log(`[SlidesRenderer] Created new presentation: ${response.data.id}`);
        return response.data.id;
    }

    /**
     * Get presentation details
     * @param {string} presentationId - Presentation ID
     * @returns {Promise<Object>} - Presentation data
     */
    async getPresentation(presentationId) {
        await this.init();

        const response = await this.slides.presentations.get({
            presentationId
        });

        return response.data;
    }

    /**
     * Replace all placeholder text in a presentation
     * Placeholders use {{PLACEHOLDER_NAME}} format
     * @param {string} presentationId - Presentation ID
     * @param {Object} replacements - Key-value pairs for replacement
     */
    async replaceAllText(presentationId, replacements) {
        await this.init();

        const requests = Object.entries(replacements).map(([key, value]) => ({
            replaceAllText: {
                containsText: {
                    text: `{{${key}}}`,
                    matchCase: true
                },
                replaceText: String(value || '')
            }
        }));

        if (requests.length === 0) {
            console.log('[SlidesRenderer] No text replacements to make');
            return;
        }

        console.log(`[SlidesRenderer] Replacing ${requests.length} text placeholders`);

        await this.slides.presentations.batchUpdate({
            presentationId,
            requestBody: { requests }
        });
    }

    /**
     * Insert an image into a specific page
     * @param {string} presentationId - Presentation ID
     * @param {string} pageId - Page object ID where image will be inserted
     * @param {string} imageUrl - Public URL of the image
     * @param {Object} bounds - Position and size of the image
     */
    async insertImage(presentationId, pageId, imageUrl, bounds) {
        await this.init();

        console.log(`[SlidesRenderer] Inserting image on page ${pageId}`);

        const requests = [{
            createImage: {
                url: imageUrl,
                elementProperties: {
                    pageObjectId: pageId,
                    size: {
                        width: { magnitude: bounds.width || 300, unit: 'PT' },
                        height: { magnitude: bounds.height || 200, unit: 'PT' }
                    },
                    transform: {
                        scaleX: 1,
                        scaleY: 1,
                        translateX: bounds.x || 100,
                        translateY: bounds.y || 100,
                        unit: 'PT'
                    }
                }
            }
        }];

        await this.slides.presentations.batchUpdate({
            presentationId,
            requestBody: { requests }
        });
    }

    /**
     * Replace an existing image placeholder with a new image
     * @param {string} presentationId - Presentation ID
     * @param {string} imageObjectId - Object ID of the image to replace
     * @param {string} newImageUrl - Public URL of the new image
     */
    async replaceImage(presentationId, imageObjectId, newImageUrl) {
        await this.init();

        console.log(`[SlidesRenderer] Replacing image ${imageObjectId}`);

        const requests = [{
            replaceImage: {
                imageObjectId,
                url: newImageUrl,
                imageReplaceMethod: 'CENTER_INSIDE'
            }
        }];

        await this.slides.presentations.batchUpdate({
            presentationId,
            requestBody: { requests }
        });
    }

    /**
     * Insert a text box with content on a specific page
     * @param {string} presentationId - Presentation ID
     * @param {string} pageId - Page object ID
     * @param {string} text - Text content
     * @param {Object} style - Styling options (x, y, width, height, fontSize, bold, color)
     */
    async insertTextBox(presentationId, pageId, text, style = {}) {
        await this.init();

        const objectId = `textbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const {
            x = 50,
            y = 50,
            width = 400,
            height = 50,
            fontSize = 18,
            bold = false,
            fontColor = { red: 0, green: 0, blue: 0 }
        } = style;

        const requests = [
            {
                createShape: {
                    objectId,
                    shapeType: 'TEXT_BOX',
                    elementProperties: {
                        pageObjectId: pageId,
                        size: {
                            width: { magnitude: width, unit: 'PT' },
                            height: { magnitude: height, unit: 'PT' }
                        },
                        transform: {
                            scaleX: 1, scaleY: 1,
                            translateX: x, translateY: y,
                            unit: 'PT'
                        }
                    }
                }
            },
            {
                insertText: {
                    objectId,
                    insertionIndex: 0,
                    text
                }
            },
            {
                updateTextStyle: {
                    objectId,
                    style: {
                        fontSize: { magnitude: fontSize, unit: 'PT' },
                        bold,
                        foregroundColor: { opaqueColor: { rgbColor: fontColor } }
                    },
                    fields: 'fontSize,bold,foregroundColor'
                }
            }
        ];

        await this.slides.presentations.batchUpdate({
            presentationId,
            requestBody: { requests }
        });

        return objectId;
    }

    /**
     * Create a complete one-pager with ZYNK branding from scratch
     * @param {string} presentationId - Presentation ID (already copied from template)
     * @param {Object} spec - Content specification
     */
    async createOnePagerFromSpec(presentationId, spec) {
        await this.init();

        console.log(`[SlidesRenderer] Creating one-pager content for ${presentationId}`);

        // Get the first page ID
        const presentation = await this.getPresentation(presentationId);
        const firstPage = presentation.slides[0];
        const pageId = firstPage.objectId;

        console.log(`[SlidesRenderer] Using page: ${pageId}`);

        // Build requests for all text boxes
        const requests = [];
        const textBoxes = [
            {
                id: 'title_box',
                text: spec.title || 'ZYNK AI Marketing Platform',
                x: 50, y: 40, width: 620, height: 60,
                fontSize: 36, bold: true,
                fontColor: { red: 0.1, green: 0.1, blue: 0.3 }
            },
            {
                id: 'subtitle_box',
                text: spec.subtitle || '',
                x: 50, y: 100, width: 620, height: 30,
                fontSize: 18, bold: false,
                fontColor: { red: 0.4, green: 0.4, blue: 0.5 }
            },
            {
                id: 'headline_box',
                text: spec.headline || '',
                x: 50, y: 150, width: 620, height: 40,
                fontSize: 24, bold: true,
                fontColor: { red: 0, green: 0.5, blue: 0.8 }
            },
            {
                id: 'body_box',
                text: spec.bodyText || spec.body || '',
                x: 50, y: 200, width: 400, height: 120,
                fontSize: 14, bold: false,
                fontColor: { red: 0.2, green: 0.2, blue: 0.2 }
            },
            {
                id: 'features_box',
                text: spec.features || '',
                x: 50, y: 340, width: 280, height: 100,
                fontSize: 12, bold: false,
                fontColor: { red: 0.3, green: 0.3, blue: 0.3 }
            },
            {
                id: 'benefits_box',
                text: spec.benefits || '',
                x: 360, y: 340, width: 280, height: 100,
                fontSize: 12, bold: false,
                fontColor: { red: 0.3, green: 0.3, blue: 0.3 }
            },
            {
                id: 'cta_box',
                text: spec.cta || '',
                x: 50, y: 460, width: 200, height: 40,
                fontSize: 16, bold: true,
                fontColor: { red: 1, green: 1, blue: 1 },
                backgroundColor: { red: 0, green: 0.6, blue: 0.9 }
            },
            {
                id: 'contact_box',
                text: spec.contact || '',
                x: 400, y: 480, width: 280, height: 30,
                fontSize: 11, bold: false,
                fontColor: { red: 0.5, green: 0.5, blue: 0.5 }
            }
        ];

        for (const box of textBoxes) {
            if (!box.text) continue;

            const objectId = `${box.id}_${Date.now()}`;

            // Create shape
            requests.push({
                createShape: {
                    objectId,
                    shapeType: 'TEXT_BOX',
                    elementProperties: {
                        pageObjectId: pageId,
                        size: {
                            width: { magnitude: box.width, unit: 'PT' },
                            height: { magnitude: box.height, unit: 'PT' }
                        },
                        transform: {
                            scaleX: 1, scaleY: 1,
                            translateX: box.x, translateY: box.y,
                            unit: 'PT'
                        }
                    }
                }
            });

            // Insert text
            requests.push({
                insertText: {
                    objectId,
                    insertionIndex: 0,
                    text: box.text
                }
            });

            // Style text
            requests.push({
                updateTextStyle: {
                    objectId,
                    style: {
                        fontSize: { magnitude: box.fontSize, unit: 'PT' },
                        bold: box.bold,
                        foregroundColor: { opaqueColor: { rgbColor: box.fontColor } }
                    },
                    fields: 'fontSize,bold,foregroundColor'
                }
            });

            // Add background for CTA button
            if (box.backgroundColor) {
                requests.push({
                    updateShapeProperties: {
                        objectId,
                        shapeProperties: {
                            shapeBackgroundFill: {
                                solidFill: {
                                    color: { rgbColor: box.backgroundColor }
                                }
                            }
                        },
                        fields: 'shapeBackgroundFill'
                    }
                });
            }
        }

        if (requests.length > 0) {
            await this.slides.presentations.batchUpdate({
                presentationId,
                requestBody: { requests }
            });
            console.log(`[SlidesRenderer] Added ${textBoxes.filter(b => b.text).length} text boxes`);
        }

        return presentation;
    }

    /**
     * Create a new blank presentation
     * @param {string} title - Presentation title
     * @returns {Promise<string>} - New presentation ID
     */
    async createBlankPresentation(title) {
        await this.init();

        console.log(`[SlidesRenderer] Creating blank presentation: "${title}"`);

        const response = await this.slides.presentations.create({
            requestBody: {
                title
            }
        });

        return response.data.presentationId;
    }

    /**
     * Share presentation with a user
     * @param {string} presentationId - Presentation ID
     * @param {string} email - User email
     * @param {string} role - 'reader', 'writer', or 'owner'
     */
    async shareWithUser(presentationId, email, role = 'writer') {
        await this.init();

        console.log(`[SlidesRenderer] Sharing ${presentationId} with ${email} as ${role}`);

        await this.drive.permissions.create({
            fileId: presentationId,
            requestBody: {
                type: 'user',
                role,
                emailAddress: email
            },
            sendNotificationEmail: false
        });
    }

    /**
     * Make presentation publicly viewable with link
     * @param {string} presentationId - Presentation ID
     */
    async makePublic(presentationId) {
        await this.init();

        await this.drive.permissions.create({
            fileId: presentationId,
            requestBody: {
                type: 'anyone',
                role: 'reader'
            }
        });

        console.log(`[SlidesRenderer] Made ${presentationId} publicly viewable`);
    }

    /**
     * Full render flow: Copy template and apply semantic spec
     * @param {string} templateId - Template presentation ID
     * @param {Object} semanticSpec - Content specification from LLM
     * @returns {Promise<Object>} - { presentationId, url, editUrl }
     */
    async render(templateId, semanticSpec) {
        await this.init();

        console.log('[SlidesRenderer] Starting full render flow');
        console.log(`[SlidesRenderer] Template: ${templateId}`);
        console.log(`[SlidesRenderer] Title: ${semanticSpec.title}`);

        // 1. Copy the template
        const presentationId = await this.copyTemplate(
            templateId,
            semanticSpec.title || 'Untitled One-Pager'
        );

        // 2. Replace text placeholders
        const textReplacements = {
            TITLE: semanticSpec.title,
            SUBTITLE: semanticSpec.subtitle,
            HEADLINE: semanticSpec.headline,
            TAGLINE: semanticSpec.tagline,
            BODY: semanticSpec.body,
            BODY_TEXT: semanticSpec.bodyText || semanticSpec.body,
            DESCRIPTION: semanticSpec.description,
            FEATURES: semanticSpec.features,
            BENEFITS: semanticSpec.benefits,
            CTA: semanticSpec.cta,
            CTA_TEXT: semanticSpec.ctaText || semanticSpec.cta,
            CONTACT: semanticSpec.contact,
            FOOTER: semanticSpec.footer,
            // Custom fields
            ...semanticSpec.customFields
        };

        // Filter out undefined/null values
        const filteredReplacements = Object.fromEntries(
            Object.entries(textReplacements).filter(([_, v]) => v != null)
        );

        await this.replaceAllText(presentationId, filteredReplacements);

        // 2b. Also add text boxes directly to ensure content is visible
        // This handles templates without placeholders
        try {
            await this.createOnePagerFromSpec(presentationId, semanticSpec);
            console.log('[SlidesRenderer] Added direct content via createOnePagerFromSpec');
        } catch (error) {
            console.warn('[SlidesRenderer] createOnePagerFromSpec warning:', error.message);
        }

        // 3. Handle hero image if provided
        if (semanticSpec.heroImageUrl && semanticSpec.heroImageObjectId) {
            try {
                await this.replaceImage(
                    presentationId,
                    semanticSpec.heroImageObjectId,
                    semanticSpec.heroImageUrl
                );
            } catch (error) {
                console.warn('[SlidesRenderer] Could not replace hero image:', error.message);
            }
        }

        // 4. Handle additional images
        if (semanticSpec.images && Array.isArray(semanticSpec.images)) {
            for (const img of semanticSpec.images) {
                try {
                    if (img.objectId) {
                        await this.replaceImage(presentationId, img.objectId, img.url);
                    } else if (img.pageId) {
                        await this.insertImage(presentationId, img.pageId, img.url, img.bounds || {});
                    }
                } catch (error) {
                    console.warn(`[SlidesRenderer] Could not add image:`, error.message);
                }
            }
        }

        // 5. Share with user if email provided
        if (semanticSpec.shareWithEmail) {
            await this.shareWithUser(presentationId, semanticSpec.shareWithEmail);
        }

        // Build result URLs
        const result = {
            presentationId,
            url: `https://docs.google.com/presentation/d/${presentationId}/edit`,
            viewUrl: `https://docs.google.com/presentation/d/${presentationId}/view`,
            embedUrl: `https://docs.google.com/presentation/d/${presentationId}/embed`,
            exportPdfUrl: `https://docs.google.com/presentation/d/${presentationId}/export/pdf`
        };

        console.log('[SlidesRenderer] ✅ Render complete:', result.url);
        return result;
    }
}

// Export singleton instance and class
const slidesRenderer = new SlidesRenderer();

module.exports = {
    SlidesRenderer,
    slidesRenderer,
    // Convenience methods
    copyTemplate: (templateId, title) => slidesRenderer.copyTemplate(templateId, title),
    render: (templateId, semanticSpec) => slidesRenderer.render(templateId, semanticSpec)
};
