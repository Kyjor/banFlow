import lokiService from './LokiService';

const TagService = {
  addTag(tagTitle) {
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
  },
};

export default TagService;
