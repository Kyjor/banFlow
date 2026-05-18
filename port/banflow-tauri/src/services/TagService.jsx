const TagService = {
  getTags(lokiService) {
    const { tags } = lokiService;
    return tags.find({ Id: { $ne: null } });
  },

  addTag(lokiService, tagTitle, color = '') {
    const { tags } = lokiService;
    const nextId = tags.length
      ? tags.chain().simplesort('$loki', true).data()[0].$loki + 1
      : 1;
    const newTag = tags.insert({
      id: `tag-${nextId}`,
      title: tagTitle,
      description: ``,
      color: color || ``,
    });
    lokiService.saveDB();

    return newTag;
  },

  updateTagColor(lokiService, tagTitle, color) {
    const { tags } = lokiService;
    tags
      .chain()
      .find({ title: tagTitle })
      .update((tag) => {
        tag.color = color;
      });
    lokiService.saveDB();
  },
};

export default TagService;
