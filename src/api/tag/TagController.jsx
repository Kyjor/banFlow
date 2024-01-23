import tagService from '../../services/TagService';

const TagController = {
  addTag(tagTitle) {
    return tagService.addTag(tagTitle);
  },
};

export default TagController;
