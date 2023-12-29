import lokiService from './LokiService';

/**
 * @class TagService
 * @desc creates a new Tag with a set of given properties
 */
class TagService {
  addTag = (tagTitle) => {
    const { tags } = lokiService;
    const nextId = tags.length
      ? tags.chain().simplesort('$loki', true).data()[0].$loki + 1
      : 1;
    const newTag = tags.insert({
      id: `tag-${nextId}`,
      title: tagTitle,
      description: ``,
      color: ``,
    });
    lokiService.saveDB();

    return newTag;
  };
}

// create one instance of the class to export so everyone can share it
const tagService = new TagService();
export default tagService;
